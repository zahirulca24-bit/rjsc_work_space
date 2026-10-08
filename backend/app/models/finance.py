import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.client import utc_now
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    invoice_no = Column(String, unique=True, index=True, nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    invoice_date = Column(Date, nullable=False)
    professional_fee = Column(Numeric, nullable=False, default=0)
    government_fee = Column(Numeric, nullable=False, default=0)
    other_cost = Column(Numeric, nullable=False, default=0)
    total_amount = Column(Numeric, nullable=False)
    status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="invoices")
    work = relationship("Work", back_populates="invoices")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=True)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), index=True, nullable=True)
    transaction_date = Column(Date, nullable=False, index=True)
    transaction_type = Column(String, nullable=False)
    amount = Column(Numeric, nullable=False)
    payment_method = Column(String, nullable=True)
    reference = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="transactions")
    work = relationship("Work", back_populates="transactions")
    invoice = relationship("Invoice")
