from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime
from decimal import Decimal
import math

from app.db.session import get_db
from app.models.work import Work, WorkRuleSnapshot
from app.schemas.work import WorkCreate, WorkRead, WorkBase
from pydantic import BaseModel

router = APIRouter()

class WorkUpdate(BaseModel):
    status: Optional[str] = None
    professional_fee: Optional[Decimal] = None
    government_fee: Optional[Decimal] = None
    other_cost: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None

def generate_work_code(db: Session) -> str:
    stmt = select(Work.work_code).where(Work.work_code.like("WORK-%"))
    codes = db.execute(stmt).scalars().all()
    max_num = 0
    for code in codes:
        try:
            num = int(code.split("-")[1])
            if num > max_num:
                max_num = num
        except Exception:
            pass
    return f"WORK-{max_num + 1:04d}"

class WorkCreateWithSnapshot(WorkCreate):
    rule_snapshot: Optional[dict] = None

@router.get("", response_model=List[WorkRead])
def list_works(db: Session = Depends(get_db)):
    stmt = select(Work).order_by(desc(Work.created_at))
    works = db.execute(stmt).scalars().all()
    return works

@router.post("", response_model=WorkRead)
def create_work(work_in: WorkCreateWithSnapshot, db: Session = Depends(get_db)):
    work_code = generate_work_code(db)
    
    total_bill = None
    if work_in.government_fee is not None:
        total_bill = work_in.professional_fee + work_in.government_fee + work_in.other_cost
        
    db_work = Work(
        work_code=work_code,
        client_id=work_in.client_id,
        service_id=work_in.service_id,
        entity_type=work_in.entity_type,
        period_or_year=work_in.period_or_year,
        assigned_to=work_in.assigned_to,
        status=work_in.status,
        professional_fee=work_in.professional_fee,
        government_fee=work_in.government_fee,
        other_cost=work_in.other_cost,
        total_bill=total_bill,
        due_date=work_in.due_date,
        started_at=work_in.started_at,
        submitted_at=work_in.submitted_at,
        completed_at=work_in.completed_at,
        notes=work_in.notes
    )
    db.add(db_work)
    db.flush()
    
    if work_in.rule_snapshot:
        snap = work_in.rule_snapshot
        db_snap = WorkRuleSnapshot(
            work_id=db_work.id,
            service_id=snap.get("service_id", work_in.service_id),
            entity_type=snap.get("entity_type", work_in.entity_type),
            fee_rule_id=snap.get("fee_rule_id"),
            fee_source_reference=snap.get("fee_source_reference"),
            deadline_rule_id=snap.get("deadline_rule_id"),
            deadline_source_reference=snap.get("deadline_source_reference"),
            document_rule_snapshot=snap.get("document_rule_snapshot"),
            fee_breakdown_snapshot=snap.get("fee_breakdown_snapshot"),
            legal_reference_snapshot=snap.get("legal_reference_snapshot")
        )
        db.add(db_snap)
        
    try:
        db.commit()
        db.refresh(db_work)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create work")
        
    return db_work

@router.get("/{work_id}", response_model=WorkRead)
def get_work(work_id: UUID, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    return work

@router.patch("/{work_id}", response_model=WorkRead)
def update_work(work_id: UUID, work_update: WorkUpdate, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
        
    update_data = work_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(work, key, value)
        
    if work.government_fee is not None:
        work.total_bill = work.professional_fee + work.government_fee + work.other_cost
    else:
        work.total_bill = None
        
    try:
        db.commit()
        db.refresh(work)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update work")
        
    return work
