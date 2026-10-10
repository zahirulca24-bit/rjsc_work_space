from datetime import datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.pilot_feedback import PilotFeedback
from app.models.user import User, RoleEnum

router = APIRouter()

Module = Literal["Login & Dashboard", "Clients", "Work Register", "Tasks", "Documents", "Billing", "Reports", "Other"]
Result = Literal["WORKING", "ISSUE", "BLOCKED", "NOT_TESTED"]
Ease = Literal["EASY", "NEEDS_GUIDANCE", "CONFUSING"]


class FeedbackCreate(BaseModel):
    module: Module
    test_case: str = Field(min_length=3, max_length=100)
    result: Result
    ease: Ease
    comment: str | None = Field(default=None, max_length=2000)
    model_config = ConfigDict(extra="forbid")


class FeedbackRead(BaseModel):
    id: UUID
    user_name: str
    user_email: str
    module: str
    test_case: str
    result: str
    ease: str
    comment: str | None
    created_at: datetime


def payload(row: PilotFeedback, user: User) -> FeedbackRead:
    return FeedbackRead(
        id=row.id,
        user_name=user.name,
        user_email=user.email,
        module=row.module,
        test_case=row.test_case,
        result=row.result,
        ease=row.ease,
        comment=row.comment,
        created_at=row.created_at,
    )


@router.post("", response_model=FeedbackRead, status_code=201)
def submit_feedback(
    body: FeedbackCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = PilotFeedback(
        user_id=user.id,
        module=body.module,
        test_case=body.test_case.strip(),
        result=body.result,
        ease=body.ease,
        comment=body.comment.strip() if body.comment else None,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return payload(row, user)


@router.get("", response_model=list[FeedbackRead])
def list_feedback(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(PilotFeedback, User).join(User, PilotFeedback.user_id == User.id)
    if user.role != RoleEnum.ADMIN:
        query = query.filter(PilotFeedback.user_id == user.id)
    rows = query.order_by(PilotFeedback.created_at.desc()).limit(500).all()
    return [payload(item, author) for item, author in rows]
