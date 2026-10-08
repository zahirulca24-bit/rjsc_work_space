import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.client import utc_now
from app.db.base import Base

class Document(Base):
    __tablename__ = "documents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), index=True, nullable=True)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=True)
    document_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    storage_provider = Column(String, nullable=True)
    storage_reference = Column(String, nullable=True)
    source_reference = Column(String, nullable=True)
    document_date = Column(Date, nullable=True)
    status = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    client = relationship("Client", back_populates="documents")
    work = relationship("Work", back_populates="documents")
