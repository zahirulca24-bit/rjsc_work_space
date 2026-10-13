from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class WorkingPaperBase(BaseModel):
    work_id: UUID
    client_id: UUID
    title: str
    paper_type: str = "ANNUAL_RETURN_COMPLIANCE"
    filing_year: Optional[str] = None
    status: str = "DRAFT"
    prepared_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None

class WorkingPaperCreate(WorkingPaperBase):
    company_data: Optional[Dict[str, Any]] = None
    directors_data: Optional[List[Dict[str, Any]]] = None
    shareholders_data: Optional[List[Dict[str, Any]]] = None
    agm_analysis: Optional[List[Dict[str, Any]]] = None
    forms_data: Optional[Dict[str, Any]] = None
    linked_documents: Optional[List[Dict[str, Any]]] = None
    missing_fields: Optional[List[Dict[str, Any]]] = None

class WorkingPaperUpdate(BaseModel):
    title: Optional[str] = None
    filing_year: Optional[str] = None
    status: Optional[str] = None
    prepared_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    notes: Optional[str] = None
    company_data: Optional[Dict[str, Any]] = None
    directors_data: Optional[List[Dict[str, Any]]] = None
    shareholders_data: Optional[List[Dict[str, Any]]] = None
    agm_analysis: Optional[List[Dict[str, Any]]] = None
    forms_data: Optional[Dict[str, Any]] = None
    linked_documents: Optional[List[Dict[str, Any]]] = None
    missing_fields: Optional[List[Dict[str, Any]]] = None

class WorkingPaperRead(WorkingPaperBase):
    id: UUID
    reviewed_at: Optional[datetime] = None
    company_data: Dict[str, Any] = {}
    directors_data: List[Dict[str, Any]] = []
    shareholders_data: List[Dict[str, Any]] = []
    agm_analysis: List[Dict[str, Any]] = []
    forms_data: Dict[str, Any] = {}
    linked_documents: List[Dict[str, Any]] = []
    missing_fields: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkingPaperReviewAction(BaseModel):
    action: str  # "SUBMIT_FOR_REVIEW", "APPROVE", "RETURN_TO_DRAFT"
    notes: Optional[str] = None
