from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Any
from datetime import date
from uuid import UUID
from app.db.session import get_db
from app.models.client import Client
from app.models.corporate_history import (
    ClientNameHistory, RegisteredOfficeHistory, CapitalHistory, Director,
    Shareholder, AgmHistory, AnnualReturnHistory, RjscFilingHistory,
    MortgageChargeHistory, ComplianceIssue
)
from pydantic import BaseModel

router = APIRouter()

def get_history_list(model, client_id, db):
    return db.execute(select(model).where(model.client_id == client_id).order_by(model.created_at.desc())).scalars().all()

@router.get("/{client_id}/history")
def get_all_history(client_id: UUID, db: Session = Depends(get_db)):
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    return {
        "name_history": get_history_list(ClientNameHistory, client_id, db),
        "registered_office_history": get_history_list(RegisteredOfficeHistory, client_id, db),
        "capital_history": get_history_list(CapitalHistory, client_id, db),
        "directors": get_history_list(Director, client_id, db),
        "shareholders": get_history_list(Shareholder, client_id, db),
        "agm_history": get_history_list(AgmHistory, client_id, db),
        "annual_returns": get_history_list(AnnualReturnHistory, client_id, db),
        "filings": get_history_list(RjscFilingHistory, client_id, db),
        "mortgage_charges": get_history_list(MortgageChargeHistory, client_id, db),
        "compliance_issues": get_history_list(ComplianceIssue, client_id, db),
    }

def create_or_update(model, client_id, db, data, record_id=None):
    if record_id:
        record = db.get(model, record_id)
        if not record or record.client_id != client_id:
            raise HTTPException(status_code=404, detail="Record not found")
        for k, v in data.items():
            column = model.__table__.columns.get(k)
            # Explicit null clears optional historical dates/notes on edit,
            # e.g. changing a recorded AGM from HELD to NOT_HELD.
            if v is not None or (column is not None and column.nullable):
                setattr(record, k, v)
    else:
        record = model(client_id=client_id, **data)
        db.add(record)
    db.commit()
    db.refresh(record)
    return record

# Schemas
class NameHistoryBase(BaseModel):
    previous_name: str
    new_name: str
    effective_date: Optional[date] = None

class OfficeHistoryBase(BaseModel):
    address: str
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None

class CapitalHistoryBase(BaseModel):
    authorized_capital: float
    paid_up_capital: float
    effective_date: Optional[date] = None
    change_type: str = "INITIAL"

class DirectorBase(BaseModel):
    full_name: str
    designation: Optional[str] = None
    appointment_date: Optional[date] = None
    cessation_date: Optional[date] = None
    is_current: bool = True

class ShareholderBase(BaseModel):
    shareholder_name: str
    share_count: float
    share_value: float
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_current: bool = True

class AgmHistoryBase(BaseModel):
    financial_year: str
    agm_date: Optional[date] = None
    status: str = "HELD"
    source_document: Optional[str] = None
    notes: Optional[str] = None

class AnnualReturnBase(BaseModel):
    financial_year: str
    filed_date: Optional[date] = None
    filing_status: str = "PENDING"
    due_date: Optional[date] = None
    acknowledgement_reference: Optional[str] = None
    notes: Optional[str] = None

class FilingBase(BaseModel):
    service_type: str
    form_name: Optional[str] = None
    submission_date: Optional[date] = None
    approval_date: Optional[date] = None
    status: str = "PENDING"
    reference: Optional[str] = None

class MortgageBase(BaseModel):
    lender: str
    secured_amount: float
    creation_date: Optional[date] = None
    modification_date: Optional[date] = None
    satisfaction_date: Optional[date] = None
    status: str = "ACTIVE"

class ComplianceBase(BaseModel):
    title: str
    category: str = "GENERAL"
    severity: str = "MEDIUM"
    status: str = "PENDING"
    due_date: Optional[date] = None
    identified_date: Optional[date] = None

# Routes Generator
configs = [
    ("name-history", NameHistoryBase, ClientNameHistory),
    ("registered-office-history", OfficeHistoryBase, RegisteredOfficeHistory),
    ("capital-history", CapitalHistoryBase, CapitalHistory),
    ("directors", DirectorBase, Director),
    ("shareholders", ShareholderBase, Shareholder),
    ("agm-history", AgmHistoryBase, AgmHistory),
    ("annual-returns", AnnualReturnBase, AnnualReturnHistory),
    ("filings", FilingBase, RjscFilingHistory),
    ("mortgage-charges", MortgageBase, MortgageChargeHistory),
    ("compliance-issues", ComplianceBase, ComplianceIssue),
]

for route_name, schema, model in configs:
    def make_post(s=schema, m=model):
        def _post(client_id: UUID, data: s, db: Session = Depends(get_db)):
            return create_or_update(m, client_id, db, data.model_dump())
        return _post
        
    def make_patch(s=schema, m=model):
        def _patch(client_id: UUID, record_id: UUID, data: s, db: Session = Depends(get_db)):
            return create_or_update(m, client_id, db, data.model_dump(exclude_unset=True), record_id)
        return _patch

    # Attach to router
    # FastAPI doesn't easily let us generate routes dynamically like this unless we use add_api_route
    router.add_api_route(f"/{{client_id}}/{route_name}", make_post(), methods=["POST"], response_model=None)
    router.add_api_route(f"/{{client_id}}/{route_name}/{{record_id}}", make_patch(), methods=["PATCH"], response_model=None)
