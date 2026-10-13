import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, Numeric, Boolean, ForeignKey, Integer, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .client import utc_now
from ..db.base import Base

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
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    financial_year = Column(String, nullable=False)
    actual_agm_date = Column(Date, nullable=True)
    audit_report_date = Column(Date, nullable=True)
    dvc_date = Column(Date, nullable=True)
    dvc_code = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    filed_date = Column(Date, nullable=True)
    filing_status = Column(String, nullable=False, default="PENDING")  # FILED, PENDING, OVERDUE, EVIDENCE_UNCERTAIN
    evidence_status = Column(String, nullable=False, default="EVIDENCE_UNCERTAIN")  # VERIFIED, EVIDENCE_UNCERTAIN, PENDING_REVIEW
    acknowledgement_reference = Column(String, nullable=True)
    source_evidence = Column(String, nullable=True)
    govt_fee = Column(Numeric, nullable=False, default=0)
    late_fee = Column(Numeric, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="annual_returns")

class ShareTransferHistory(Base):
    __tablename__ = "share_transfer_history"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=False)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    transfer_no = Column(String, nullable=False, default="1")
    transferor_name = Column(String, nullable=False)
    transferor_address = Column(String, nullable=True)
    transferee_name = Column(String, nullable=False)
    transferee_address = Column(String, nullable=True)
    share_class = Column(String, nullable=False, default="Ordinary Shares")
    share_count = Column(Numeric, nullable=False)
    nominal_value = Column(Numeric, nullable=False, default=100)
    paid_up_per_share = Column(Numeric, nullable=False, default=100)
    consideration_amount = Column(Numeric, nullable=False)
    distinctive_from = Column(Numeric, nullable=True)
    distinctive_to = Column(Numeric, nullable=True)
    execution_date = Column(Date, nullable=True)
    board_approval_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="DRAFT")  # DRAFT, APPROVED, EXECUTED_IN_REGISTER, CANCELLED
    pre_transfer_state = Column(JSON, nullable=True)
    post_transfer_state = Column(JSON, nullable=True)
    source_evidence = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="share_transfers")

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
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    charge_type = Column(String, nullable=False, default="CREATION")  # CREATION, MODIFICATION, SATISFACTION
    lender = Column(String, nullable=False)
    secured_amount = Column(Numeric, nullable=False)
    instrument_type = Column(String, nullable=True)  # e.g. Deed of Mortgage, Letter of Hypothecation
    instrument_date = Column(Date, nullable=True)
    creation_date = Column(Date, nullable=True)
    modification_date = Column(Date, nullable=True)
    registration_date = Column(Date, nullable=True)
    filing_reference = Column(String, nullable=True)
    property_description = Column(Text, nullable=True)
    modification_details = Column(Text, nullable=True)
    satisfaction_date = Column(Date, nullable=True)
    satisfaction_noc_ref = Column(String, nullable=True)
    statutory_form_code = Column(String, nullable=False, default="FORM_XVIII")  # FORM_XVIII, FORM_XIX, FORM_XXVIII
    status = Column(String, nullable=False, default="ACTIVE")  # ACTIVE, MODIFIED, SATISFIED
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
