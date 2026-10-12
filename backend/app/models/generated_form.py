import uuid
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from .client import utc_now
from ..db.base import Base

def JSONVariant():
    return JSON().with_variant(JSONB, 'postgresql')

class GeneratedFormRecord(Base):
    __tablename__ = "generated_forms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    working_paper_id = Column(UUID(as_uuid=True), ForeignKey("working_papers.id"), nullable=True)

    form_code = Column(String, index=True, nullable=False)  # FORM_XII, SCHEDULE_X, FORM_23B, FORM_VI
    form_title = Column(String, nullable=False)
    version = Column(Integer, nullable=False, default=1)

    file_path = Column(String, nullable=False)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    page_count = Column(Integer, nullable=False, default=1)

    # Status: DRAFT, REVIEWED, APPROVED_FOR_PORTAL_UPLOAD, ARCHIVED
    # NOTE: Never label PORTAL_ACCEPTED without actual portal acceptance proof
    status = Column(String, nullable=False, default="DRAFT")

    generated_by = Column(String, nullable=False, default="SYSTEM")
    reviewed_by = Column(String, nullable=True)
    review_notes = Column(Text, nullable=True)

    missing_fields = Column(JSONVariant(), nullable=False, default=list)
    form_parameters = Column(JSONVariant(), nullable=False, default=dict)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    work = relationship("Work", back_populates="generated_forms")
    client = relationship("Client", back_populates="generated_forms")
