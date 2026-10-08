import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, Numeric, Boolean, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.client import utc_now
from app.db.base import Base

class ClientNameHistory(Base):
    __tablename__ = "client_name_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    previous_name = Column(String, nullable=False)
    new_name = Column(String, nullable=False)
    effective_date = Column(Date, nullable=False)
    source_document = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="name_history")

class RegisteredOfficeHistory(Base):
    __tablename__ = "registered_office_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    address = Column(Text, nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_to = Column(Date, nullable=True)
    source_document = Column(String, nullable=True)
    filing_reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="office_history")

class CapitalHistory(Base):
    __tablename__ = "capital_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    authorized_capital = Column(Numeric, nullable=False)
    paid_up_capital = Column(Numeric, nullable=False)
    effective_date = Column(Date, nullable=False)
    change_type = Column(String, nullable=True)
    source_document = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="capital_history")

class Director(Base):
    __tablename__ = "directors"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    full_name = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    nid_or_passport_reference = Column(String, nullable=True)
    appointment_date = Column(Date, nullable=True)
    cessation_date = Column(Date, nullable=True)
    is_current = Column(Boolean, nullable=False, default=True)
    source_document = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="directors")

class Shareholder(Base):
    __tablename__ = "shareholders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    shareholder_name = Column(String, nullable=False)
    share_count = Column(Numeric, nullable=False)
    share_value = Column(Numeric, nullable=False)
    ownership_percentage = Column(Numeric, nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    is_current = Column(Boolean, nullable=False, default=True)
    source_document = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="shareholders")

class AgmHistory(Base):
    __tablename__ = "agm_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    financial_year = Column(String, nullable=False)
    agm_date = Column(Date, nullable=True)
    status = Column(String, nullable=False)
    source_document = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="agms")

class AnnualReturnHistory(Base):
    __tablename__ = "annual_return_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    financial_year = Column(String, nullable=False)
    due_date = Column(Date, nullable=True)
    filed_date = Column(Date, nullable=True)
    filing_status = Column(String, nullable=False)
    acknowledgement_reference = Column(String, nullable=True)
    govt_fee = Column(Numeric, nullable=False, default=0)
    late_fee = Column(Numeric, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="annual_returns")

class RjscFilingHistory(Base):
    __tablename__ = "rjsc_filing_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    service_type = Column(String, nullable=False)
    form_name = Column(String, nullable=True)
    effective_date = Column(Date, nullable=True)
    submission_date = Column(Date, nullable=True)
    approval_date = Column(Date, nullable=True)
    status = Column(String, nullable=False)
    reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="filings")

class MortgageChargeHistory(Base):
    __tablename__ = "mortgage_charge_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    lender = Column(String, nullable=False)
    secured_amount = Column(Numeric, nullable=False)
    creation_date = Column(Date, nullable=True)
    modification_date = Column(Date, nullable=True)
    satisfaction_date = Column(Date, nullable=True)
    status = Column(String, nullable=False)
    filing_reference = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="mortgage_charges")

class ComplianceIssue(Base):
    __tablename__ = "compliance_issues"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    identified_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True, index=True)
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False, index=True)
    resolution_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="compliance_issues")
