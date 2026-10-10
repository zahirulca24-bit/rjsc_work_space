import uuid
import hashlib
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "image/jpeg",
    "image/png"
}

from sqlalchemy import or_

from app.db.session import get_db
from app.models.document import Document

from app.models.work import Work
from app.services.storage import get_storage_provider
from app.core.config import settings
from pydantic import BaseModel, UUID4
from app.api.deps import require_roles
from app.models.user import RoleEnum, User

router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".xls", ".csv", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

class DocumentResponse(BaseModel):
    id: UUID4
    client_id: Optional[UUID4]
    work_id: Optional[UUID4]
    document_name: str
    original_filename: Optional[str]
    category: str
    mime_type: Optional[str]
    file_size: Optional[int]
    file_hash: Optional[str]
    status: str
    document_date: Optional[date]
    notes: Optional[str]

    class Config:
      from_attributes = True

class DocumentUpdate(BaseModel):
    category: Optional[str] = None
    status: Optional[str] = None
    document_date: Optional[date] = None
    notes: Optional[str] = None


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    client_id: Optional[uuid.UUID] = Form(None),
    work_id: Optional[uuid.UUID] = Form(None),
    category: str = Form(...),
    document_date: Optional[date] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.xls', '.csv', '.jpg', '.jpeg', '.png'}
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    import mimetypes
    guessed = mimetypes.guess_type(file.filename or "")[0]
    if guessed and guessed != file.content_type and file.content_type not in ('application/octet-stream', 'application/x-msdownload'):
        if not (ext == '.csv' and file.content_type in ('text/csv', 'application/vnd.ms-excel')):
            raise HTTPException(status_code=400, detail="MIME type does not match")

    file_size = 0
    import hashlib
    sha256 = hashlib.sha256()
    while chunk := await file.read(1024 * 1024):
        file_size += len(chunk)
        sha256.update(chunk)
        if file_size > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds limit")
    file_hash = sha256.hexdigest()

    if client_id and work_id:
        duplicate = db.query(Document).filter(Document.client_id == client_id, Document.work_id == work_id, Document.file_hash == file_hash, Document.status != "DELETED").first()
    elif client_id:
        duplicate = db.query(Document).filter(Document.client_id == client_id, Document.work_id.is_(None), Document.file_hash == file_hash, Document.status != "DELETED").first()
    elif work_id:
        duplicate = db.query(Document).filter(Document.client_id.is_(None), Document.work_id == work_id, Document.file_hash == file_hash, Document.status != "DELETED").first()
    else:
        duplicate = db.query(Document).filter(Document.client_id.is_(None), Document.work_id.is_(None), Document.file_hash == file_hash, Document.status != "DELETED").first()

    if duplicate:
        raise HTTPException(status_code=409, detail="Duplicate file in this context")

    await file.seek(0)

    from app.models.client import Client
    from app.models.work import Work
    upload_context = {}

    if client_id:
        c_obj = db.query(Client).filter(Client.id == client_id).first()
        if not c_obj:
            raise HTTPException(status_code=404, detail="Client not found")
        upload_context['client_name'] = f"{c_obj.client_code} - {c_obj.legal_name}"

    if work_id:
        work_obj = db.query(Work).filter(Work.id == work_id).first()
        if not work_obj:
            raise HTTPException(status_code=404, detail="Work not found")
        if client_id and work_obj.client_id and str(work_obj.client_id) != str(client_id):
            raise HTTPException(status_code=400, detail="Work does not belong to client")
        upload_context['work_name'] = work_obj.work_code if hasattr(work_obj, 'work_code') else str(work_obj.id)
        if not upload_context.get('client_name') and work_obj.client_id:
            c_obj2 = db.query(Client).filter(Client.id == work_obj.client_id).first()
            if c_obj2:
                upload_context['client_name'] = f"{c_obj2.client_code} - {c_obj2.legal_name}"

    provider = get_storage_provider(settings.STORAGE_PROVIDER)
    storage_ref = await provider.save_file(file.file, file.filename or "unknown", context=upload_context)

    doc = Document(
      client_id=client_id,
      work_id=work_id,
      document_name=file.filename or "Untitled",
      original_filename=file.filename,
      category=category,
      mime_type=file.content_type,
      file_size=file_size,
      file_hash=file_hash,
      storage_provider=settings.STORAGE_PROVIDER,
      storage_reference=storage_ref,
      document_date=document_date,
      status="RECEIVED",
      notes=notes
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("", response_model=List[DocumentResponse])

def list_documents(
    client_id: Optional[UUID4] = None,
    work_id: Optional[UUID4] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Document)
    client_obj = None
    if client_id:
      query = query.filter(Document.client_id == client_id)
    if work_id:
      query = query.filter(Document.work_id == work_id)
    if category:
      query = query.filter(Document.category == category)
    if status:
      query = query.filter(Document.status == status)
    if search:
      query = query.filter(Document.document_name.ilike(f"%{search}%"))

    return query.order_by(Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: UUID4, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
      raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: UUID4,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value, RoleEnum.SENIOR.value))
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
      raise HTTPException(status_code=404, detail="Document not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
      setattr(doc, key, value)

    db.commit()
    db.refresh(doc)
    return doc

@router.get("/{document_id}/download")
async def download_document(document_id: UUID4, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
      raise HTTPException(status_code=404, detail="Document not found")

    if not doc.storage_reference or doc.storage_provider not in ("local", "google_drive"):
      raise HTTPException(status_code=404, detail="Document file not available")

    # Use the provider recorded on the document, not the current default.
    # Google Drive and local storage both expose exists() / get_file_stream().
    provider = get_storage_provider(doc.storage_provider)

    from fastapi.responses import StreamingResponse

    if not await provider.exists(doc.storage_reference):
        raise HTTPException(status_code=404, detail="File missing from storage")
    file_stream = provider.get_file_stream(doc.storage_reference)

    return StreamingResponse(
        file_stream,
        media_type=doc.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=\"{doc.original_filename or 'download'}\""}
    )

