import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, Text, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base import Base

class EntityType(str, enum.Enum):
    PRIVATE_COMPANY = "PRIVATE_COMPANY"
    PUBLIC_COMPANY = "PUBLIC_COMPANY"
    FOREIGN_COMPANY = "FOREIGN_COMPANY"
    SOCIETY = "SOCIETY"
    PARTNERSHIP = "PARTNERSHIP"
    TRADE_ORGANIZATION = "TRADE_ORGANIZATION"

def utc_now():
    return datetime.now(timezone.utc)

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_code = Column(String, unique=True, index=True, nullable=False)
    legal_name = Column(String, index=True, nullable=False)
    entity_type = Column(Enum(EntityType), nullable=False)
    registration_no = Column(String, index=True, nullable=True)
    incorporation_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="ACTIVE")
    former_name = Column(String, nullable=True)
    tin = Column(String, nullable=True)
    bin = Column(String, nullable=True)
    registered_office_text = Column(Text, nullable=True)
    contact_person = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    email = Column(String, nullable=True)
    assigned_staff = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    
    works = relationship("Work", back_populates="client")
    name_history = relationship("ClientNameHistory", back_populates="client")
    office_history = relationship("RegisteredOfficeHistory", back_populates="client")
    capital_history = relationship("CapitalHistory", back_populates="client")
    directors = relationship("Director", back_populates="client")
    shareholders = relationship("Shareholder", back_populates="client")
    agms = relationship("AgmHistory", back_populates="client")
    annual_returns = relationship("AnnualReturnHistory", back_populates="client")
    filings = relationship("RjscFilingHistory", back_populates="client")
    mortgage_charges = relationship("MortgageChargeHistory", back_populates="client")
    compliance_issues = relationship("ComplianceIssue", back_populates="client")
    documents = relationship("Document", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")
    transactions = relationship("Transaction", back_populates="client")
