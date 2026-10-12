from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Any
from datetime import date, timedelta
from uuid import UUID
from app.db.session import get_db
from app.models.client import Client
from app.models.corporate_history import (
    ClientNameHistory, RegisteredOfficeHistory, CapitalHistory, Director,
    Shareholder, ShareTransferHistory, AgmHistory, AnnualReturnHistory, RjscFilingHistory,
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
        "share_transfers": get_history_list(ShareTransferHistory, client_id, db),
        "agm_history": get_history_list(AgmHistory, client_id, db),
        "annual_returns": get_history_list(AnnualReturnHistory, client_id, db),
        "filings": get_history_list(RjscFilingHistory, client_id, db),
        "mortgage_charges": get_history_list(MortgageChargeHistory, client_id, db),
        "compliance_issues": get_history_list(ComplianceIssue, client_id, db),
    }

def create_or_update(model, client_id, db, data, record_id=None):
    # Statutory auto-calculations for Annual Return
    if model == AnnualReturnHistory:
        actual_agm = data.get("actual_agm_date")
        if actual_agm and not data.get("due_date"):
            data["due_date"] = actual_agm + timedelta(days=21)
        
        due = data.get("due_date")
        filed = data.get("filed_date")
        ack = data.get("acknowledgement_reference")
        src = data.get("source_evidence")
        if filed:
            data["filing_status"] = "FILED"
            # Require verified acknowledgment or source evidence before marking VERIFIED
            if (ack and str(ack).strip()) or (src and str(src).strip()):
                data["evidence_status"] = "VERIFIED"
            else:
                data["evidence_status"] = "REVIEW_REQUIRED"
        elif due:
            today = date.today()
            if today > due:
                data["filing_status"] = "OVERDUE"
            else:
                data["filing_status"] = "PENDING"
        elif not actual_agm and not filed and not data.get("filing_status"):
            data["filing_status"] = "EVIDENCE_UNCERTAIN"
            data["evidence_status"] = "EVIDENCE_UNCERTAIN"

    # Backward compatibility and statutory fields for MortgageChargeHistory
    if model == MortgageChargeHistory:
        c_date = data.get("creation_date")
        i_date = data.get("instrument_date")
        if c_date and not i_date:
            data["instrument_date"] = c_date
        elif i_date and not c_date:
            data["creation_date"] = i_date

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

class ShareTransferBase(BaseModel):
    transfer_no: Optional[str] = "1"
    transferor_name: str
    transferor_address: Optional[str] = None
    transferee_name: str
    transferee_address: Optional[str] = None
    share_class: Optional[str] = "Ordinary Shares"
    share_count: float
    nominal_value: Optional[float] = 100.0
    paid_up_per_share: Optional[float] = 100.0
    consideration_amount: float
    distinctive_from: Optional[int] = None
    distinctive_to: Optional[int] = None
    execution_date: Optional[date] = None
    board_approval_date: Optional[date] = None
    status: Optional[str] = "DRAFT"
    pre_transfer_state: Optional[Any] = None
    post_transfer_state: Optional[Any] = None
    source_evidence: Optional[str] = None
    notes: Optional[str] = None
    work_id: Optional[UUID] = None

class AgmHistoryBase(BaseModel):
    financial_year: str
    agm_date: Optional[date] = None
    status: str = "HELD"
    source_document: Optional[str] = None
    notes: Optional[str] = None

class AnnualReturnBase(BaseModel):
    financial_year: str
    actual_agm_date: Optional[date] = None
    audit_report_date: Optional[date] = None
    dvc_date: Optional[date] = None
    dvc_code: Optional[str] = None
    due_date: Optional[date] = None
    filed_date: Optional[date] = None
    filing_status: Optional[str] = "PENDING"
    evidence_status: Optional[str] = "EVIDENCE_UNCERTAIN"
    acknowledgement_reference: Optional[str] = None
    source_evidence: Optional[str] = None
    govt_fee: Optional[float] = 0.0
    late_fee: Optional[float] = 0.0
    notes: Optional[str] = None
    work_id: Optional[UUID] = None

class FilingBase(BaseModel):
    service_type: str
    form_name: Optional[str] = None
    submission_date: Optional[date] = None
    approval_date: Optional[date] = None
    status: str = "PENDING"
    reference: Optional[str] = None

class MortgageBase(BaseModel):
    charge_type: Optional[str] = "CREATION"
    lender: str
    secured_amount: float
    instrument_type: Optional[str] = None
    instrument_date: Optional[date] = None
    creation_date: Optional[date] = None
    modification_date: Optional[date] = None
    registration_date: Optional[date] = None
    filing_reference: Optional[str] = None
    property_description: Optional[str] = None
    modification_details: Optional[str] = None
    satisfaction_date: Optional[date] = None
    satisfaction_noc_ref: Optional[str] = None
    statutory_form_code: Optional[str] = "FORM_XVIII"
    status: Optional[str] = "ACTIVE"
    notes: Optional[str] = None
    work_id: Optional[UUID] = None

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
    ("share-transfers", ShareTransferBase, ShareTransferHistory),
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
