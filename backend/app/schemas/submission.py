from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime, date

class WorkSubmissionFormItem(BaseModel):
    form_code: str
    form_title: str
    version: int = 1
    file_name: Optional[str] = None
    file_path: Optional[str] = None

class PreSubmissionReviewResponse(BaseModel):
    work_id: UUID
    client_id: UUID
    service_id: str
    work_status: str
    review_status: str
    filing_year: Optional[str] = None
    is_approved_for_submission: bool
    approved_forms: List[Dict[str, Any]]
    latest_generated_forms: List[Dict[str, Any]]
    required_checklist_items: List[Dict[str, Any]]
    completed_checklist_count: int
    total_checklist_count: int
    missing_documents: List[Dict[str, Any]]
    is_submission_ready: bool
    readiness_warnings: List[str]

class WorkSubmissionCreate(BaseModel):
    submitted_at: datetime
    submitted_by: str
    rjsc_tracking_no: str
    portal_ack_ref: Optional[str] = None
    govt_fee_challan_ref: Optional[str] = None
    ack_document_id: Optional[UUID] = None
    ack_document_name: Optional[str] = None
    filing_year: Optional[str] = None
    forms_submitted: List[Dict[str, Any]] = []
    notes: Optional[str] = None

class WorkResubmissionCreate(BaseModel):
    parent_submission_id: UUID
    submitted_at: datetime
    submitted_by: str
    rjsc_tracking_no: str
    portal_ack_ref: Optional[str] = None
    govt_fee_challan_ref: Optional[str] = None
    ack_document_id: Optional[UUID] = None
    ack_document_name: Optional[str] = None
    filing_year: Optional[str] = None
    forms_submitted: List[Dict[str, Any]] = []
    resolves_query_id: Optional[UUID] = None
    resolution_notes: Optional[str] = None
    notes: Optional[str] = None

class WorkQueryCreate(BaseModel):
    submission_id: UUID
    query_date: date
    query_reference: Optional[str] = None
    query_subject: str
    query_description: str
    query_document_id: Optional[UUID] = None
    query_document_name: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline_date: Optional[date] = None
    create_correction_task: bool = True

class WorkQueryUpdate(BaseModel):
    status: Optional[str] = None  # OPEN, IN_PROGRESS, RESOLVED, WAIVED
    resolution_notes: Optional[str] = None
    assigned_to: Optional[str] = None
    deadline_date: Optional[date] = None

class WorkDeliveryCreate(BaseModel):
    outcome: str = "APPROVED"  # APPROVED, CERTIFIED_COPY_ISSUED, REJECTED
    outcome_date: date
    rjsc_approval_ref: Optional[str] = None
    certified_copy_document_id: Optional[UUID] = None
    certified_copy_document_name: Optional[str] = None
    delivered_to_client_at: Optional[datetime] = None
    delivered_by: Optional[str] = None
    delivery_method: Optional[str] = "HAND_DELIVERY"
    client_ack_ref: Optional[str] = None
    client_ack_document_id: Optional[UUID] = None
    client_ack_document_name: Optional[str] = None
    notes: Optional[str] = None
    close_work_operationally: bool = True

class WorkQueryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submission_id: UUID
    work_id: UUID
    client_id: UUID
    query_date: date
    query_reference: Optional[str] = None
    query_subject: str
    query_description: str
    query_document_id: Optional[UUID] = None
    query_document_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_user_id: Optional[UUID] = None
    deadline_date: Optional[date] = None
    linked_task_id: Optional[UUID] = None
    status: str
    resolution_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class WorkSubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_id: UUID
    client_id: UUID
    submission_type: str
    submission_number: int
    parent_submission_id: Optional[UUID] = None
    filing_year: Optional[str] = None
    forms_submitted: List[Dict[str, Any]]
    submitted_at: datetime
    submitted_by: str
    submitted_by_user_id: Optional[UUID] = None
    rjsc_tracking_no: str
    portal_ack_ref: Optional[str] = None
    govt_fee_challan_ref: Optional[str] = None
    ack_document_id: Optional[UUID] = None
    ack_document_name: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    queries: List[WorkQueryRead] = []

class WorkDeliveryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    work_id: UUID
    client_id: UUID
    outcome: str
    outcome_date: date
    rjsc_approval_ref: Optional[str] = None
    certified_copy_document_id: Optional[UUID] = None
    certified_copy_document_name: Optional[str] = None
    delivered_to_client_at: Optional[datetime] = None
    delivered_by: Optional[str] = None
    delivery_method: Optional[str] = None
    client_ack_ref: Optional[str] = None
    client_ack_document_id: Optional[UUID] = None
    client_ack_document_name: Optional[str] = None
    operational_closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    notes: Optional[str] = None
    corporate_history_filing_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

class SubmissionLifecycleHistoryResponse(BaseModel):
    work_id: UUID
    client_id: UUID
    work_status: str
    review_status: str
    submissions: List[WorkSubmissionRead]
    active_queries: List[WorkQueryRead]
    resolved_queries: List[WorkQueryRead]
    delivery: Optional[WorkDeliveryRead] = None
