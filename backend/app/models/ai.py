import uuid

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.types import JSON

from app.db.base import Base
from app.models.client import utc_now


def JSONVariant():
    return JSON().with_variant(JSONB, "postgresql")


class DocumentAIAnalysis(Base):
    __tablename__ = "document_ai_analyses"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id"),
        nullable=False,
        index=True,
    )

    provider = Column(
        String,
        nullable=False,
        default="groq",
    )

    model = Column(
        String,
        nullable=False,
    )

    status = Column(
        String,
        nullable=False,
        default="COMPLETED",
    )

    extracted_text = Column(
        Text,
        nullable=True,
    )

    suggested_category = Column(
        String,
        nullable=True,
    )

    confidence = Column(
        Numeric(5, 4),
        nullable=True,
    )

    extracted_metadata = Column(
        JSONVariant(),
        nullable=True,
    )

    checklist_matches = Column(
        JSONVariant(),
        nullable=True,
    )

    missing_checklist_items = Column(
        JSONVariant(),
        nullable=True,
    )

    needs_source_review = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    approved_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
