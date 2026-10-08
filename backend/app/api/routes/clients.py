from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import re

from app.db.session import get_db
from app.models.client import Client, EntityType
from app.models.corporate_history import (
    ClientNameHistory, RegisteredOfficeHistory, CapitalHistory, Director,
    Shareholder, AgmHistory, AnnualReturnHistory, RjscFilingHistory,
    MortgageChargeHistory, ComplianceIssue
)
from app.schemas.client import ClientCreate, ClientRead, ClientBase
from pydantic import BaseModel

router = APIRouter()

class ClientUpdate(BaseModel):
    legal_name: Optional[str] = None
    entity_type: Optional[EntityType] = None
    registration_no: Optional[str] = None
    incorporation_date: Optional[datetime] = None
    status: Optional[str] = None
    former_name: Optional[str] = None
    tin: Optional[str] = None
    bin: Optional[str] = None
    registered_office_text: Optional[str] = None
    contact_person: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None
    assigned_staff: Optional[str] = None
    notes: Optional[str] = None

def generate_client_code(db: Session) -> str:
    stmt = select(Client.client_code).where(Client.client_code.like("RJSC-%"))
    codes = db.execute(stmt).scalars().all()
    max_num = 0
    for code in codes:
        try:
            num = int(code.split("-")[1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"RJSC-{max_num + 1:04d}"

def check_duplicate_name(db: Session, legal_name: str) -> List[dict]:
    normalized_name = re.sub(r'[^a-zA-Z0-9]', '', legal_name.lower())
    if not normalized_name:
        return []

    stmt = select(Client.id, Client.legal_name, Client.client_code)
    results = db.execute(stmt).all()

    potential_duplicates = []
    for row in results:
        norm_row = re.sub(r'[^a-zA-Z0-9]', '', row.legal_name.lower())
        if norm_row == normalized_name:
            potential_duplicates.append({
                "id": str(row.id),
                "legal_name": row.legal_name,
                "client_code": row.client_code
            })
    return potential_duplicates

@router.get("", response_model=List[ClientRead])
def list_clients(
    db: Session = Depends(get_db),
    search: Optional[str] = None,
    entity_type: Optional[EntityType] = None,
    status: Optional[str] = None,
):
    stmt = select(Client)
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (Client.legal_name.ilike(search_pattern)) |
            (Client.client_code.ilike(search_pattern)) |
            (Client.registration_no.ilike(search_pattern))
        )
    if entity_type:
        stmt = stmt.where(Client.entity_type == entity_type)
    if status:
        stmt = stmt.where(Client.status == status)

    stmt = stmt.order_by(desc(Client.created_at))
    clients = db.execute(stmt).scalars().all()
    return clients

@router.post("", response_model=ClientRead)
def create_client(client_in: ClientCreate, db: Session = Depends(get_db)):
    if client_in.registration_no:
        existing = db.execute(
            select(Client).where(Client.registration_no == client_in.registration_no)
        ).scalars().first()
        if existing:
            raise HTTPException(status_code=409, detail="Registration number already exists")

    client_code = generate_client_code(db)

    while db.execute(select(Client).where(Client.client_code == client_code)).scalars().first():
        num = int(client_code.split("-")[1])
        client_code = f"RJSC-{num + 1:04d}"

    db_client = Client(
        client_code=client_code,
        legal_name=client_in.legal_name,
        entity_type=client_in.entity_type,
        registration_no=client_in.registration_no,
        incorporation_date=client_in.incorporation_date,
        status=client_in.status,
        former_name=client_in.former_name,
        tin=client_in.tin,
        bin=client_in.bin,
        registered_office_text=client_in.registered_office_text,
        contact_person=client_in.contact_person,
        mobile=client_in.mobile,
        email=client_in.email,
        assigned_staff=client_in.assigned_staff,
        notes=client_in.notes
    )

    db.add(db_client)
    try:
        db.commit()
        db.refresh(db_client)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create client")

    return db_client

@router.get("/{client_id}", response_model=ClientRead)
def get_client(client_id: UUID, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.patch("/{client_id}", response_model=ClientRead)
def update_client(client_id: UUID, client_update: ClientUpdate, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if client_update.registration_no and client_update.registration_no != client.registration_no:
        existing = db.execute(
            select(Client).where(Client.registration_no == client_update.registration_no)
        ).scalars().first()
        if existing:
            raise HTTPException(status_code=409, detail="Registration number already exists")

    update_data = client_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(client, key, value)

    try:
        db.commit()
        db.refresh(client)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update client")

    return client

@router.get("/{client_id}/current-position")
def get_current_position(client_id: UUID, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Office
    stmt_office = select(RegisteredOfficeHistory).where(
        RegisteredOfficeHistory.client_id == client_id
    ).order_by(desc(RegisteredOfficeHistory.effective_from), desc(RegisteredOfficeHistory.created_at))
    latest_office = db.execute(stmt_office).scalars().first()

    # Capital
    stmt_capital = select(CapitalHistory).where(
        CapitalHistory.client_id == client_id
    ).order_by(desc(CapitalHistory.effective_date), desc(CapitalHistory.created_at))
    latest_capital = db.execute(stmt_capital).scalars().first()

    # Directors
    stmt_directors = select(Director).where(
        Director.client_id == client_id, Director.is_current == True
    )
    current_directors = db.execute(stmt_directors).scalars().all()

    # Shareholders
    stmt_shareholders = select(Shareholder).where(
        Shareholder.client_id == client_id, Shareholder.is_current == True
    )
    current_shareholders = db.execute(stmt_shareholders).scalars().all()

    # AGM
    stmt_agm = select(AgmHistory).where(
        AgmHistory.client_id == client_id
    ).order_by(desc(AgmHistory.financial_year), desc(AgmHistory.created_at))
    last_agm = db.execute(stmt_agm).scalars().first()

    # Annual Return
    stmt_ar = select(AnnualReturnHistory).where(
        AnnualReturnHistory.client_id == client_id
    ).order_by(desc(AnnualReturnHistory.financial_year), desc(AnnualReturnHistory.created_at))
    last_ar = db.execute(stmt_ar).scalars().first()

    # Compliance
    stmt_comp = select(ComplianceIssue).where(
        ComplianceIssue.client_id == client_id,
        ComplianceIssue.status.in_(["OPEN", "PENDING"])
    ).order_by(ComplianceIssue.due_date.asc().nulls_last())
    compliances = db.execute(stmt_comp).scalars().all()
    pending_compliance_count = len(compliances)
    next_known_compliance_action = compliances[0] if compliances else None

    # Latest Filing
    stmt_filing = select(RjscFilingHistory).where(
        RjscFilingHistory.client_id == client_id
    ).order_by(RjscFilingHistory.submission_date.desc().nulls_last(), desc(RjscFilingHistory.created_at))
    latest_filing = db.execute(stmt_filing).scalars().first()

    return {
        "current_legal_name": client.legal_name,
        "current_entity_status": client.status,
        "current_registered_office": latest_office.address if latest_office else client.registered_office_text,
        "authorized_capital": float(latest_capital.authorized_capital) if latest_capital else None,
        "paid_up_capital": float(latest_capital.paid_up_capital) if latest_capital else None,
        "current_directors": [{"id": str(d.id), "full_name": d.full_name, "designation": d.designation} for d in current_directors],
        "current_shareholders": [{"id": str(s.id), "shareholder_name": s.shareholder_name, "share_count": float(s.share_count)} for s in current_shareholders],
        "last_agm": {"financial_year": last_agm.financial_year, "agm_date": last_agm.agm_date} if last_agm else None,
        "last_annual_return": {"financial_year": last_ar.financial_year, "filed_date": last_ar.filed_date} if last_ar else None,
        "latest_filing": {"service_type": latest_filing.service_type, "submission_date": latest_filing.submission_date} if latest_filing else None,
        "pending_compliance_count": pending_compliance_count,
        "next_known_compliance_action": {"title": next_known_compliance_action.title, "due_date": next_known_compliance_action.due_date} if next_known_compliance_action else None
    }

from app.api.routes.history import router as history_router
HISTORY_ROUTER = history_router

from uuid import UUID
@router.get("/{client_id}/financial-summary")
def get_client_financial_summary(client_id: UUID, db: Session = Depends(get_db)):
    from app.models.finance import Invoice, Transaction
    from app.models.work import Work
    from sqlalchemy import func
    from decimal import Decimal

    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Client not found")

    billed = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.client_id == client_id,
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
    ).scalar() or Decimal("0")

    collected = db.query(func.sum(Transaction.amount)).filter(
        Transaction.client_id == client_id,
        Transaction.transaction_type == "COLLECTION"
    ).scalar() or Decimal("0")

    completed_works_val = db.query(func.sum(Invoice.total_amount)).join(Work, Invoice.work_id == Work.id).filter(
        Invoice.client_id == client_id,
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"]),
        Work.status == "COMPLETED"
    ).scalar() or Decimal("0")

    open_works_val = billed - completed_works_val

    return {
        "total_billed": str(billed),
        "total_collected": str(collected),
        "outstanding": str(billed - collected),
        "completed_works_value": str(completed_works_val),
        "open_works_value": str(open_works_val)
    }
