import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from app.models.client import utc_now
from app.db.base import Base

class RjscSnapshot(Base):
    __tablename__ = "rjsc_snapshots"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False, index=True)
    source_reference = Column(String, nullable=False)
    checked_on = Column(Date, nullable=False)
    checked_by = Column(String, nullable=False)
    is_verified = Column(Boolean, nullable=False, default=False)
    fields = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
