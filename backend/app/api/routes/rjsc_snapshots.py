from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.client import Client
from app.models.rjsc_snapshot import RjscSnapshot
from app.models.user import User, RoleEnum

router = APIRouter()

ALLOWED_KEYS = {
    "legal_name", "registration_no", "incorporation_date",
    "registered_office", "current_directors", "authorized_capital", "paid_up_capital"
}

class SnapshotInput(BaseModel):
    source_reference: str = Field(min_length=3, max_length=600)
    checked_on: date
    is_verified: bool = False
    fields: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_snapshot(self):
        self.source_reference = self.source_reference.strip()
        if self.is_verified and not self.source_reference:
            raise ValueError("Verified snapshots require a source reference")
        if not self.source_reference:
            raise ValueError("Source reference is required")
        if not self.fields:
            raise ValueError("Enter at least one RJSC field")
        if set(self.fields) - ALLOWED_KEYS:
            raise ValueError("Unknown RJSC field key")
        self.fields = {k: v.strip() for k, v in self.fields.items() if isinstance(v, str) and v.strip()}
        if any(len(v) > 1000 for v in self.fields.values()):
            raise ValueError("Each RJSC source field must be 1000 characters or fewer")
        if not self.fields:
            raise ValueError("Enter at least one nonempty RJSC field")
        if self.checked_on > date.today():
            raise ValueError("Check date cannot be in the future")
        return self

@router.get("/{client_id}")
def list_snapshots(client_id: UUID, db: Session = Depends(get_db)):
    if not db.get(Client, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    records = db.execute(
        select(RjscSnapshot).where(RjscSnapshot.client_id == client_id)
        .order_by(RjscSnapshot.created_at.desc(), RjscSnapshot.id.desc()).limit(25)
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "source_reference": r.source_reference,
            "checked_on": r.checked_on,
            "checked_by": r.checked_by,
            "is_verified": r.is_verified,
            "fields": r.fields,
            "created_at": r.created_at,
        }
        for r in records
    ]

@router.post("/{client_id}", status_code=201)
def save_snapshot(
    client_id: UUID,
    payload: SnapshotInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(RoleEnum.ADMIN.value, RoleEnum.MANAGER.value)),
):
    if not db.get(Client, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    record = RjscSnapshot(
        client_id=client_id,
        source_reference=payload.source_reference,
        checked_on=payload.checked_on,
        checked_by=current_user.name,
        is_verified=payload.is_verified,
        fields=payload.fields,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": str(record.id), "status": "saved"}
