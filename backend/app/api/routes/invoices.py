from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, UUID4, ConfigDict
from decimal import Decimal

from app.db.session import get_db
from app.models.finance import Invoice, Transaction
from app.models.client import Client
from app.models.work import Work
from app.api.deps import require_roles
from app.models.user import RoleEnum, User

router = APIRouter()

class InvoiceCreate(BaseModel):
    client_id: UUID4
    work_id: Optional[UUID4] = None
    invoice_date: date
    professional_fee: Decimal
    government_fee: Decimal
    other_cost: Decimal
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID4
    invoice_no: str
    client_id: UUID4
    work_id: Optional[UUID4]
    invoice_date: date
    professional_fee: Decimal
    government_fee: Decimal
    other_cost: Decimal
    total_amount: Decimal
    status: str
    notes: Optional[str]

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

def generate_invoice_no(db: Session) -> str:
    invoices = db.query(Invoice.invoice_no).all()
    max_num = 0
    for (inv_no,) in invoices:
        if inv_no and inv_no.startswith("INV-"):
            try:
                num = int(inv_no.split("-")[1])
                if num > max_num:
                    max_num = num
            except ValueError:
                pass
    return f"INV-{max_num + 1:04d}"

@router.post("", response_model=InvoiceResponse)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value))
):
    if payload.professional_fee < 0 or payload.government_fee < 0 or payload.other_cost < 0:
        raise HTTPException(status_code=400, detail="Fee amounts must be >= 0")

    client = db.query(Client).filter(Client.id == payload.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if payload.work_id:
        work = db.query(Work).filter(Work.id == payload.work_id).first()
        if not work:
            raise HTTPException(status_code=404, detail="Work not found")
        if str(work.client_id) != str(payload.client_id):
            raise HTTPException(status_code=400, detail="Work does not belong to client")

        if work.government_fee is None:
            raise HTTPException(status_code=400, detail="Work government fee is unknown/pending. Please resolve it first.")

    total_amount = payload.professional_fee + payload.government_fee + payload.other_cost

    invoice_no = generate_invoice_no(db)

    inv = Invoice(
        invoice_no=invoice_no,
        client_id=payload.client_id,
        work_id=payload.work_id,
        invoice_date=payload.invoice_date,
        professional_fee=payload.professional_fee,
        government_fee=payload.government_fee,
        other_cost=payload.other_cost,
        total_amount=total_amount,
        status="ISSUED",
        notes=payload.notes
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    client_id: Optional[UUID4] = None,
    work_id: Optional[UUID4] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Invoice)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if work_id:
        query = query.filter(Invoice.work_id == work_id)
    if status:
        query = query.filter(Invoice.status == status)
    if date_from:
        query = query.filter(Invoice.invoice_date >= date_from)
    if date_to:
        query = query.filter(Invoice.invoice_date <= date_to)
    if search:
        query = query.join(Client, Invoice.client_id == Client.id, isouter=True)
        query = query.join(Work, Invoice.work_id == Work.id, isouter=True)
        query = query.filter(or_(
            Invoice.invoice_no.ilike(f"%{search}%"),
            Client.legal_name.ilike(f"%{search}%"),
            Client.client_code.ilike(f"%{search}%"),
            Work.work_code.ilike(f"%{search}%")
        ))

    return query.order_by(desc(Invoice.invoice_date), desc(Invoice.created_at)).all()

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(invoice_id: UUID4, db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv

@router.patch("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: UUID4,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value))
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if payload.status is not None:
        inv.status = payload.status
    if payload.notes is not None:
        inv.notes = payload.notes

    db.commit()
    db.refresh(inv)
    return inv
