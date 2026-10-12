import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .client import utc_now
from ..db.base import Base

def JSONVariant():
    return JSON().with_variant(JSONB, 'postgresql')

class WorkSubmissionRecord(Base):
    __tablename__ = "work_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)

    submission_type = Column(String, nullable=False, default="INITIAL")  # INITIAL, RESUBMISSION
    submission_number = Column(Integer, nullable=False, default=1)
    parent_submission_id = Column(UUID(as_uuid=True), ForeignKey("work_submissions.id"), nullable=True)

    filing_year = Column(String, nullable=True)
    forms_submitted = Column(JSONVariant(), nullable=False, default=list)  # list of dicts: [{form_code, form_title, version, file_name}]

    submitted_at = Column(DateTime(timezone=True), nullable=False)
    submitted_by = Column(String, nullable=False)
    submitted_by_user_id = Column(UUID(as_uuid=True), nullable=True)

    rjsc_tracking_no = Column(String, nullable=False, index=True)
    portal_ack_ref = Column(String, nullable=True)
    govt_fee_challan_ref = Column(String, nullable=True)

    ack_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    ack_document_name = Column(String, nullable=True)

    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="SUBMITTED")  # SUBMITTED, QUERY_RAISED, ACCEPTED, REJECTED

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    work = relationship("Work", back_populates="submissions")
    client = relationship("Client", back_populates="submissions")
    queries = relationship("WorkQueryRecord", back_populates="submission", cascade="all, delete-orphan")
    resubmissions = relationship("WorkSubmissionRecord", backref="parent_submission", remote_side=[id])


class WorkQueryRecord(Base):
    __tablename__ = "work_queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("work_submissions.id"), index=True, nullable=False)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)

    query_date = Column(Date, nullable=False)
    query_reference = Column(String, nullable=True)
    query_subject = Column(String, nullable=False)
    query_description = Column(Text, nullable=False)

    query_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    query_document_name = Column(String, nullable=True)

    assigned_to = Column(String, nullable=True)
    assigned_user_id = Column(UUID(as_uuid=True), nullable=True)
    deadline_date = Column(Date, nullable=True)

    linked_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)

    status = Column(String, nullable=False, default="OPEN")  # OPEN, IN_PROGRESS, RESOLVED, WAIVED
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    submission = relationship("WorkSubmissionRecord", back_populates="queries")
    work = relationship("Work", back_populates="queries")


class WorkDeliveryRecord(Base):
    __tablename__ = "work_deliveries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), unique=True, index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)

    outcome = Column(String, nullable=False, default="APPROVED")  # APPROVED, CERTIFIED_COPY_ISSUED, REJECTED
    outcome_date = Column(Date, nullable=False)
    rjsc_approval_ref = Column(String, nullable=True)

    certified_copy_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    certified_copy_document_name = Column(String, nullable=True)

    delivered_to_client_at = Column(DateTime(timezone=True), nullable=True)
    delivered_by = Column(String, nullable=True)
    delivery_method = Column(String, nullable=True)  # HAND_DELIVERY, EMAIL, COURIER, CLIENT_PORTAL

    client_ack_ref = Column(String, nullable=True)
    client_ack_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    client_ack_document_name = Column(String, nullable=True)

    operational_closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_by = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    corporate_history_filing_id = Column(UUID(as_uuid=True), ForeignKey("rjsc_filing_history.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    work = relationship("Work", back_populates="delivery")
