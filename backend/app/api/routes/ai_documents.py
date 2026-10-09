from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.config import settings
from app.db.session import get_db
from app.models.ai import DocumentAIAnalysis
from app.models.document import Document
from app.models.user import RoleEnum, User
from app.models.work import WorkChecklist
from app.services.document_extraction import (
    IMAGE_EXTENSIONS,
    UnsupportedExtractionError,
    extract_document_text,
)
from app.services.groq_ai import (
    AIResponseError,
    AIUnavailableError,
    analyze_image_document,
    analyze_text_document,
    is_configured,
)
from app.services.storage import get_storage_provider


router = APIRouter()


class AIApprovalRequest(BaseModel):
    apply_category: bool = True


def _analysis_to_dict(
    analysis: DocumentAIAnalysis,
) -> dict:
    confidence = (
        float(analysis.confidence)
        if analysis.confidence is not None
        else None
    )

    return {
        "id": str(analysis.id),
        "document_id": str(analysis.document_id),
        "provider": analysis.provider,
        "model": analysis.model,
        "status": analysis.status,
        "extracted_text": analysis.extracted_text,
        "suggested_category": analysis.suggested_category,
        "confidence": confidence,
        "extracted_metadata": (
            analysis.extracted_metadata or {}
        ),
        "checklist_matches": (
            analysis.checklist_matches or []
        ),
        "missing_checklist_items": (
            analysis.missing_checklist_items or []
        ),
        "needs_source_review": (
            analysis.needs_source_review
        ),
        "approved": bool(
            analysis.approved_by_user_id
        ),
        "approved_by_user_id": (
            str(analysis.approved_by_user_id)
            if analysis.approved_by_user_id
            else None
        ),
        "approved_at": (
            analysis.approved_at.isoformat()
            if analysis.approved_at
            else None
        ),
        "created_at": (
            analysis.created_at.isoformat()
            if analysis.created_at
            else None
        ),
    }


def _get_document(
    db: Session,
    document_id: UUID,
) -> Document:
    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return document


def _get_checklist(
    db: Session,
    document: Document,
) -> list[dict]:
    if not document.work_id:
        return []

    items = (
        db.query(WorkChecklist)
        .filter(
            WorkChecklist.work_id
            == document.work_id
        )
        .order_by(
            WorkChecklist.sort_order,
            WorkChecklist.created_at,
        )
        .all()
    )

    return [
        {
            "item_id": str(item.id),
            "item_code": item.item_code,
            "item_text": item.item_text,
            "status": item.status,
        }
        for item in items
    ]


def _missing_items(
    checklist: list[dict],
    matches: list[dict],
) -> list[dict]:
    matched_ids = {
        str(match.get("item_id"))
        for match in matches
        if match.get("item_id")
    }

    satisfied_statuses = {
        "RECEIVED",
        "COMPLETED",
        "N/A",
        "NA",
        "NOT_APPLICABLE",
    }

    result = []

    for item in checklist:
        item_id = str(item["item_id"])

        if item_id in matched_ids:
            continue

        if str(
            item.get("status", "")
        ).upper() in satisfied_statuses:
            continue

        result.append({
            "item_id": item_id,
            "item_code": item.get("item_code"),
            "item_text": item.get("item_text"),
            "current_status": item.get("status"),
        })

    return result


@router.get("/ai/status")
def ai_status():
    return {
        "provider": settings.AI_PROVIDER,
        "configured": is_configured(),
        "text_model": settings.GROQ_TEXT_MODEL,
        "vision_model": settings.GROQ_VISION_MODEL,
        "human_approval_required": True,
        "legal_inference_enabled": False,
    }


@router.post(
    "/{document_id}/ai-analyze",
)
async def analyze_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    document = _get_document(
        db,
        document_id,
    )

    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Groq AI is not configured",
        )

    if not document.storage_reference:
        raise HTTPException(
            status_code=409,
            detail="Document has no stored file",
        )

    provider_name = (
        document.storage_provider
        or settings.STORAGE_PROVIDER
    )

    provider = get_storage_provider(
        provider_name
    )

    try:
        file_data = await provider.get_file(
            document.storage_reference
        )
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Document storage is unavailable",
        )

    if not file_data:
        raise HTTPException(
            status_code=404,
            detail="Stored document file not found",
        )

    checklist = _get_checklist(
        db,
        document,
    )

    filename = (
        document.original_filename
        or document.document_name
        or "document"
    )

    extension = Path(
        filename
    ).suffix.lower()

    extracted_text: Optional[str] = None

    try:
        if extension in IMAGE_EXTENSIONS:
            result = await analyze_image_document(
                filename=filename,
                mime_type=(
                    document.mime_type
                    or "image/jpeg"
                ),
                data=file_data,
                checklist=checklist,
            )

            document.extracted_text_status = (
                "VISION_ANALYZED"
            )

        else:
            extracted_text = (
                extract_document_text(
                    file_data,
                    filename,
                    settings.AI_MAX_TEXT_CHARS,
                )
            )

            if not extracted_text.strip():
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "No readable text was extracted "
                        "from the document"
                    ),
                )

            result = await analyze_text_document(
                filename=filename,
                text=extracted_text,
                checklist=checklist,
            )

            document.extracted_text_status = (
                "COMPLETED"
            )

    except UnsupportedExtractionError as exc:
        document.extracted_text_status = (
            "UNSUPPORTED"
        )
        db.commit()

        raise HTTPException(
            status_code=422,
            detail=str(exc),
        )

    except AIUnavailableError as exc:
        document.classification_status = (
            "AI_UNAVAILABLE"
        )
        db.commit()

        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    except AIResponseError as exc:
        document.classification_status = (
            "NEEDS_SOURCE_REVIEW"
        )
        db.commit()

        raise HTTPException(
            status_code=502,
            detail=str(exc),
        )

    matches = (
        result.get("checklist_matches")
        or []
    )

    missing = _missing_items(
        checklist,
        matches,
    )

    analysis = DocumentAIAnalysis(
        document_id=document.id,
        provider="groq",
        model=result["model"],
        status="COMPLETED",
        extracted_text=extracted_text,
        suggested_category=(
            result.get("suggested_category")
        ),
        confidence=Decimal(
            str(
                result.get(
                    "confidence",
                    0,
                )
            )
        ),
        extracted_metadata=(
            result.get(
                "extracted_metadata",
                {},
            )
        ),
        checklist_matches=matches,
        missing_checklist_items=missing,
        needs_source_review=bool(
            result.get(
                "needs_source_review",
                True,
            )
        ),
    )

    document.classification_status = (
        "NEEDS_SOURCE_REVIEW"
        if analysis.needs_source_review
        else "AI_SUGGESTED"
    )

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return _analysis_to_dict(
        analysis
    )


@router.get(
    "/{document_id}/ai-analysis",
)
def latest_analysis(
    document_id: UUID,
    db: Session = Depends(get_db),
):
    _get_document(
        db,
        document_id,
    )

    analysis = (
        db.query(DocumentAIAnalysis)
        .filter(
            DocumentAIAnalysis.document_id
            == document_id
        )
        .order_by(
            DocumentAIAnalysis.created_at.desc()
        )
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="AI analysis not found",
        )

    return _analysis_to_dict(
        analysis
    )


@router.post(
    "/{document_id}/ai-analysis/{analysis_id}/approve",
)
def approve_analysis(
    document_id: UUID,
    analysis_id: UUID,
    payload: AIApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            RoleEnum.ADMIN.value,
            RoleEnum.MANAGER.value,
            RoleEnum.SENIOR.value,
        )
    ),
):
    document = _get_document(
        db,
        document_id,
    )

    analysis = (
        db.query(DocumentAIAnalysis)
        .filter(
            DocumentAIAnalysis.id
            == analysis_id,
            DocumentAIAnalysis.document_id
            == document_id,
        )
        .first()
    )

    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="AI analysis not found",
        )

    if analysis.approved_by_user_id:
        raise HTTPException(
            status_code=409,
            detail="AI analysis already approved",
        )

    if (
        payload.apply_category
        and analysis.suggested_category
    ):
        document.category = (
            analysis.suggested_category
        )

    approver_id = current_user.id

    if not isinstance(approver_id, UUID):
        try:
            approver_id = UUID(str(approver_id))
        except (ValueError, TypeError, AttributeError):
            raise HTTPException(
                status_code=500,
                detail="Invalid authenticated user identifier",
            )

    analysis.approved_by_user_id = approver_id
    analysis.approved_at = (
        datetime.now(timezone.utc)
    )

    document.classification_status = (
        "APPROVED"
    )

    db.commit()
    db.refresh(analysis)

    return {
        "status": "approved",
        "document_id": str(document.id),
        "category": document.category,
        "analysis": _analysis_to_dict(
            analysis
        ),
        "checklist_auto_updated": False,
    }
