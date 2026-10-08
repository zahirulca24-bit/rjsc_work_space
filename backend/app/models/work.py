import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, Numeric, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import relationship
from app.models.client import utc_now
from app.db.base import Base

def JSONVariant():
    return JSON().with_variant(JSONB, 'postgresql')

class Work(Base):
    __tablename__ = "works"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_code = Column(String, unique=True, index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    service_id = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    period_or_year = Column(String, nullable=True)
    assigned_to = Column(String, nullable=True)
    status = Column(String, nullable=False, index=True)
    professional_fee = Column(Numeric, nullable=False, default=0)
    government_fee = Column(Numeric, nullable=True)
    other_cost = Column(Numeric, nullable=False, default=0)
    total_bill = Column(Numeric, nullable=True)
    due_date = Column(Date, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    client = relationship("Client", back_populates="works")
    rule_snapshot = relationship("WorkRuleSnapshot", back_populates="work", uselist=False)
    checklist_items = relationship("WorkChecklist", back_populates="work")
    documents = relationship("Document", back_populates="work")
    tasks = relationship("Task", back_populates="work")
    reviews = relationship("WorkReview", back_populates="work")
    invoices = relationship("Invoice", back_populates="work")
    transactions = relationship("Transaction", back_populates="work")

class WorkRuleSnapshot(Base):
    __tablename__ = "work_rule_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), unique=True, nullable=False)
    service_id = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    rule_effective_date = Column(Date, nullable=True)
    fee_rule_id = Column(String, nullable=True)
    fee_source_reference = Column(String, nullable=True)
    deadline_rule_id = Column(String, nullable=True)
    deadline_source_reference = Column(String, nullable=True)
    document_rule_snapshot = Column(JSONVariant(), nullable=True)
    fee_breakdown_snapshot = Column(JSONVariant(), nullable=True)
    legal_reference_snapshot = Column(JSONVariant(), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    work = relationship("Work", back_populates="rule_snapshot")

class WorkChecklist(Base):
    __tablename__ = "work_checklists"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    item_code = Column(String, nullable=True)
    item_text = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    source_reference = Column(String, nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    work = relationship("Work", back_populates="checklist_items")
