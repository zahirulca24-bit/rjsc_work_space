import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.types import JSON
from app.models.client import utc_now
from app.db.base import Base

def JSONVariant():
    return JSON().with_variant(JSONB, 'postgresql')

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    action = Column(String, nullable=False)
    performed_by = Column(String, nullable=True)
    old_values = Column(JSONVariant(), nullable=True)
    new_values = Column(JSONVariant(), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
