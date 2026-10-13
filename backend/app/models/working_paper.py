import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .client import utc_now
from ..db.base import Base

def JSONVariant():
    return JSON().with_variant(JSONB, 'postgresql')

class WorkingPaper(Base):
    __tablename__ = "working_papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)

    title = Column(String, nullable=False)
    paper_type = Column(String, nullable=False, default="ANNUAL_RETURN_COMPLIANCE")
    filing_year = Column(String, nullable=True)
    status = Column(String, nullable=False, default="DRAFT")  # DRAFT, IN_REVIEW, APPROVED, FINAL

    prepared_by = Column(String, nullable=True)
    reviewed_by = Column(String, nullable=True)
    approved_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Work-specific data snapshots (isolates working paper from subsequent master changes)
    company_data = Column(JSONVariant(), nullable=False, default=dict)
    directors_data = Column(JSONVariant(), nullable=False, default=list)
    shareholders_data = Column(JSONVariant(), nullable=False, default=list)
    agm_analysis = Column(JSONVariant(), nullable=False, default=list)
    forms_data = Column(JSONVariant(), nullable=False, default=dict)
    linked_documents = Column(JSONVariant(), nullable=False, default=list)
    missing_fields = Column(JSONVariant(), nullable=False, default=list)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    work = relationship("Work", back_populates="working_papers")
    client = relationship("Client", back_populates="working_papers")
