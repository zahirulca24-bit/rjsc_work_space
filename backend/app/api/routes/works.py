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
from app.models.user import User, RoleEnum
from app.api.deps import get_current_user

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
def update_work(work_id: UUID, work_update: WorkUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")
    if current_user.role == RoleEnum.JUNIOR.value and getattr(work, "review_status", "DRAFT") not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
        raise HTTPException(status_code=403, detail="Cannot edit work under review")

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

from app.models.work import WorkChecklist

class ChecklistItemRead(BaseModel):
    id: UUID
    work_id: UUID
    item_code: Optional[str]
    item_text: str
    status: str
    source_reference: Optional[str]
    sort_order: int
    completed_at: Optional[datetime]
    completed_by: Optional[str]

    class Config:
        from_attributes = True

class ChecklistItemUpdate(BaseModel):
    status: str

@router.get("/{work_id}/checklist", response_model=List[ChecklistItemRead])
def get_checklist(work_id: UUID, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    stmt = select(WorkChecklist).where(WorkChecklist.work_id == work_id).order_by(WorkChecklist.sort_order)
    return db.execute(stmt).scalars().all()

@router.patch("/{work_id}/checklist/{item_id}", response_model=ChecklistItemRead)
def update_checklist_item(work_id: UUID, item_id: UUID, payload: ChecklistItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.get(WorkChecklist, item_id)
    if not item or item.work_id != work_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    work = db.get(Work, work_id)
    if current_user.role == RoleEnum.JUNIOR.value and getattr(work, "review_status", "DRAFT") not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
        raise HTTPException(status_code=403, detail="Cannot edit checklist under review")

    item.status = payload.status
    if payload.status == "COMPLETED":
        item.completed_at = datetime.utcnow()
    else:
        item.completed_at = None

    db.commit()
    db.refresh(item)
    return item

from uuid import UUID
@router.get("/{work_id}/financial-summary")
def get_work_financial_summary(work_id: UUID, db: Session = Depends(get_db)):
    from app.models.finance import Invoice, Transaction
    from sqlalchemy import func
    from decimal import Decimal

    w = db.query(Work).filter(Work.id == work_id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Work not found")

    billed = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.work_id == work_id,
        Invoice.status.in_(["ISSUED", "PARTIALLY_PAID", "PAID"])
    ).scalar() or Decimal("0")

    collected = db.query(func.sum(Transaction.amount)).filter(
        Transaction.work_id == work_id,
        Transaction.transaction_type == "COLLECTION"
    ).scalar() or Decimal("0")

    return {
        "professional_fee": str(w.professional_fee or 0),
        "government_fee": str(w.government_fee) if w.government_fee is not None else None,
        "other_cost": str(w.other_cost or 0),
        "total_bill": str((w.professional_fee or 0) + (w.government_fee or 0) + (w.other_cost or 0)),
        "invoice_total": str(billed),
        "collection_total": str(collected),
        "outstanding": str(billed - collected)
    }

from app.models.user import User, RoleEnum
from app.api.deps import get_current_user
from app.models.workflow import WorkReview

class ReviewActionReq(BaseModel):
    action: str
    comment: Optional[str] = None

@router.get("/{work_id}/reviews")
def get_work_reviews(work_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reviews = db.query(WorkReview).filter(WorkReview.work_id == work_id).order_by(WorkReview.created_at).all()
    results = []
    for r in reviews:
        reviewer_name = "System"
        if r.reviewer_user_id:
            u = db.query(User).filter(User.id == r.reviewer_user_id).first()
            if u:
                reviewer_name = u.name
        results.append({
            "id": r.id,
            "work_id": r.work_id,
            "reviewer_name": reviewer_name,
            "reviewer_role": r.reviewer_role,
            "action": r.action,
            "comment": r.comment,
            "created_at": r.created_at
        })
    return results

@router.post("/{work_id}/review-actions")
def post_review_action(
    work_id: UUID,
    payload: ReviewActionReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    action = payload.action
    comment = (payload.comment or "").strip()

    requires_comment = action in ["RETURN_BY_SENIOR", "RETURN_BY_MANAGER"]
    if requires_comment and not comment:
        raise HTTPException(status_code=422, detail="Comment is mandatory for this action")

    role = current_user.role
    current_status = work.review_status or "DRAFT"
    new_status = None

    if action == "SUBMIT_TO_SENIOR":
        if role not in [RoleEnum.JUNIOR.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "SUBMITTED_TO_SENIOR"

    elif action == "RETURN_BY_SENIOR":
        if role not in [RoleEnum.SENIOR.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_SENIOR":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "RETURNED_BY_SENIOR"

    elif action == "APPROVE_BY_SENIOR":
        if role not in [RoleEnum.SENIOR.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_SENIOR":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "SUBMITTED_TO_MANAGER"

    elif action == "RETURN_BY_MANAGER":
        if role not in [RoleEnum.MANAGER.value, RoleEnum.ADMIN.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_MANAGER":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "RETURNED_BY_MANAGER"

    elif action == "FINAL_APPROVE":
        if role not in [RoleEnum.MANAGER.value, RoleEnum.ADMIN.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_MANAGER":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "APPROVED"

    else:
        raise HTTPException(status_code=400, detail="Unknown action")

    work.review_status = new_status
    review_record = WorkReview(
        work_id=work.id,
        reviewer_user_id=current_user.id,
        reviewer_role=current_user.role,
        action=action,
        comment=comment if comment else None
    )
    db.add(review_record)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to record review action")

    return {"status": "success", "new_status": new_status}
