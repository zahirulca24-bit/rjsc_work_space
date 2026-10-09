from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.user import RoleEnum, User


router = APIRouter()


class AuditLogRead(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    action: str
    performed_by: Optional[str]
    performed_by_name: Optional[str] = None
    old_values: Optional[dict[str, Any]]
    new_values: Optional[dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get("", response_model=List[AuditLogRead])
def list_audit_logs(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[UUID] = Query(None),
    action: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value)
    ),
):
    query = db.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    if action:
        query = query.filter(AuditLog.action == action)

    rows = (
        query.order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    performer_ids = []
    for row in rows:
        try:
            performer_ids.append(UUID(row.performed_by))
        except Exception:
            pass

    users = (
        db.query(User).filter(User.id.in_(performer_ids)).all()
        if performer_ids
        else []
    )
    names = {str(user.id): user.name for user in users}

    return [
        {
            "id": row.id,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "action": row.action,
            "performed_by": row.performed_by,
            "performed_by_name": names.get(row.performed_by),
            "old_values": row.old_values,
            "new_values": row.new_values,
            "created_at": row.created_at,
        }
        for row in rows
    ]
