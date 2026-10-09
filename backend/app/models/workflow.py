import uuid
from sqlalchemy import Column, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.client import utc_now
from app.db.base import Base

class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    assigned_to = Column(String, nullable=True)
    status = Column(String, nullable=False)
    priority = Column(String, nullable=False)
    due_date = Column(Date, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    work = relationship("Work", back_populates="tasks")

class WorkReview(Base):
    __tablename__ = "work_reviews"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    work_id = Column(UUID(as_uuid=True), ForeignKey("works.id"), index=True, nullable=False)
    review_level = Column(String, nullable=False, default='JUNIOR')
    reviewer = Column(String, nullable=True)
    status = Column(String, nullable=False, default='PENDING')
    review_note = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewer_user_id = Column(UUID(as_uuid=True), nullable=True)
    reviewer_role = Column(String, nullable=True)
    action = Column(String, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    work = relationship("Work", back_populates="reviews")
