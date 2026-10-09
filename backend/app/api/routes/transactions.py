from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, UUID4, ConfigDict
from decimal import Decimal

from app.db.session import get_db
from app.models.finance import Transaction, Invoice
from app.models.client import Client
from app.models.work import Work
from app.api.deps import require_roles
from app.models.user import RoleEnum, User

router = APIRouter()

class TransactionCreate(BaseModel):
    client_id: Optional[UUID4] = None
    work_id: Optional[UUID4] = None
    invoice_id: Optional[UUID4] = None
    transaction_date: date
    transaction_type: str
    amount: Decimal
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID4
    client_id: Optional[UUID4]
    work_id: Optional[UUID4]
    invoice_id: Optional[UUID4]
    transaction_date: date
    transaction_type: str
    amount: Decimal
    payment_method: Optional[str]
    reference: Optional[str]
    description: Optional[str]

class TransactionUpdate(BaseModel):
    transaction_type: Optional[str] = None
    payment_method: Optional[str] = None
    reference: Optional[str] = None
    description: Optional[str] = None

def update_invoice_status(db: Session, invoice_id: UUID4):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        return

    # Valid collection amounts
    collected = db.query(func.sum(Transaction.amount)).filter(
        Transaction.invoice_id == invoice_id,
        Transaction.transaction_type == "COLLECTION"
    ).scalar() or Decimal("0")

    # Deriving status
    if inv.status == "CANCELLED":
        return

    if collected <= 0:
        inv.status = "ISSUED"
    elif collected < inv.total_amount:
        inv.status = "PARTIALLY_PAID"
    else:
        inv.status = "PAID"

@router.post("", response_model=TransactionResponse)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value))
):
    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    if payload.transaction_type == "COLLECTION" and payload.amount == 0:
        raise HTTPException(status_code=400, detail="Collection amount must be > 0")

    if payload.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if payload.transaction_type == "COLLECTION" and inv.status in ["DRAFT", "CANCELLED"]:
            raise HTTPException(status_code=400, detail="Cannot collect on DRAFT or CANCELLED invoice")
        if payload.client_id and str(inv.client_id) != str(payload.client_id):
            raise HTTPException(status_code=400, detail="Invoice does not belong to client")

        if payload.transaction_type == "COLLECTION":
            collected = db.query(func.sum(Transaction.amount)).filter(
                Transaction.invoice_id == inv.id,
                Transaction.transaction_type == "COLLECTION"
            ).scalar() or Decimal("0")

            if collected + payload.amount > inv.total_amount:
                raise HTTPException(status_code=400, detail="Collection exceeds outstanding amount")

    if payload.client_id:
        c = db.query(Client).filter(Client.id == payload.client_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Client not found")

    if payload.work_id:
        w = db.query(Work).filter(Work.id == payload.work_id).first()
        if not w:
            raise HTTPException(status_code=404, detail="Work not found")
        if payload.client_id and str(w.client_id) != str(payload.client_id):
            raise HTTPException(status_code=400, detail="Work does not belong to client")

    txn = Transaction(
        client_id=payload.client_id,
        work_id=payload.work_id,
        invoice_id=payload.invoice_id,
        transaction_date=payload.transaction_date,
        transaction_type=payload.transaction_type,
        amount=payload.amount,
        payment_method=payload.payment_method,
        reference=payload.reference,
        description=payload.description
    )
    db.add(txn)

    try:
        db.flush()
        if payload.invoice_id and payload.transaction_type == "COLLECTION":
            update_invoice_status(db, payload.invoice_id)
        db.commit()
        db.refresh(txn)
    except Exception as e:
        db.rollback()
        raise e

    return txn

@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    client_id: Optional[UUID4] = None,
    work_id: Optional[UUID4] = None,
    invoice_id: Optional[UUID4] = None,
    transaction_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    if client_id:
        query = query.filter(Transaction.client_id == client_id)
    if work_id:
        query = query.filter(Transaction.work_id == work_id)
    if invoice_id:
        query = query.filter(Transaction.invoice_id == invoice_id)
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if date_from:
        query = query.filter(Transaction.transaction_date >= date_from)
    if date_to:
        query = query.filter(Transaction.transaction_date <= date_to)
    if search:
        query = query.join(Client, Transaction.client_id == Client.id, isouter=True)
        query = query.join(Work, Transaction.work_id == Work.id, isouter=True)
        query = query.join(Invoice, Transaction.invoice_id == Invoice.id, isouter=True)
        query = query.filter(or_(
            Transaction.reference.ilike(f"%{search}%"),
            Transaction.description.ilike(f"%{search}%"),
            Client.legal_name.ilike(f"%{search}%"),
            Invoice.invoice_no.ilike(f"%{search}%")
        ))

    return query.order_by(desc(Transaction.transaction_date), desc(Transaction.created_at)).all()

@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: UUID4, db: Session = Depends(get_db)):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn

@router.patch("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID4,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value))
):
    txn = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    if payload.transaction_type is not None:
        if txn.transaction_type == "COLLECTION" and txn.invoice_id is not None and payload.transaction_type != "COLLECTION":
            raise HTTPException(status_code=400, detail="Cannot change transaction_type of a linked invoice collection")
        txn.transaction_type = payload.transaction_type
    if payload.payment_method is not None:
        txn.payment_method = payload.payment_method
    if payload.reference is not None:
        txn.reference = payload.reference
    if payload.description is not None:
        txn.description = payload.description

    db.commit()
    db.refresh(txn)
    return txn
