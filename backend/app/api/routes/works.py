from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func
from typing import List, Optional, Any
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
import math

from app.db.session import get_db
from app.models.work import Work, WorkRuleSnapshot, WorkChecklist
from app.models.document import Document
from app.schemas.work import WorkCreate, WorkRead, WorkBase
from pydantic import BaseModel, ConfigDict
from app.models.user import User, RoleEnum
from app.api.deps import get_current_user

router = APIRouter()

class WorkUpdate(BaseModel):
    status: Optional[str] = None
    review_status: Optional[str] = None
    assigned_to: Optional[str] = None
    period_or_year: Optional[str] = None
    professional_fee: Optional[Decimal] = None
    government_fee: Optional[Decimal] = None
    other_cost: Optional[Decimal] = None
    due_date: Optional[date] = None
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
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

def populate_work_checklist(db: Session, work: Work, rule_snapshot: Optional[dict] = None):
    existing_count = db.query(WorkChecklist).filter(WorkChecklist.work_id == work.id).count()
    if existing_count > 0:
        return

    items_to_create = []

    # 1. From snapshot if present
    if rule_snapshot:
        doc_snap = rule_snapshot.get("document_rule_snapshot") or rule_snapshot.get("checklist_items")
        if isinstance(doc_snap, list) and len(doc_snap) > 0:
            for idx, item in enumerate(doc_snap):
                items_to_create.append({
                    "item_code": item.get("id") or item.get("item_code") or f"DOC_{idx+1}",
                    "item_text": item.get("documentName") or item.get("item_text") or item.get("title") or f"Document Requirement {idx+1}",
                    "source_reference": item.get("sourceReference") or item.get("source_reference"),
                    "sort_order": item.get("sortOrder") or item.get("sort_order") or (idx + 1)
                })

    # 2. Service-driven defaults for known services only
    if not items_to_create:
        s_id = (work.service_id or "").lower()
        if "annual" in s_id or "return" in s_id and "test" not in s_id:
            items_to_create = [
                {"item_code": "DOC_SCHED_X", "item_text": "Schedule X (Annual Return of Company having Share Capital)", "source_reference": "Companies Act 1994, Sec 36(1) (21 days after AGM)", "sort_order": 1},
                {"item_code": "DOC_BALANCE_SHEET", "item_text": "Audited Balance Sheet", "source_reference": "Companies Act 1994, Sec 185 & 190 (Laid before AGM)", "sort_order": 2},
                {"item_code": "DOC_PROFIT_LOSS", "item_text": "Profit & Loss Account / Income Statement", "source_reference": "Companies Act 1994, Sec 185 & 190 (Laid before AGM)", "sort_order": 3},
                {"item_code": "DOC_FORM_23B", "item_text": "Form 23B (Consent of Auditor to Act)", "source_reference": "Companies Act 1994, Sec 210(2) (30 days from appointment)", "sort_order": 4},
                {"item_code": "DOC_AGM_NOTICE", "item_text": "Notice & Minutes of Annual General Meeting (AGM)", "source_reference": "Companies Act 1994, Sec 81", "sort_order": 5},
            ]
        elif "xii" in s_id and "test" not in s_id:
            items_to_create = [
                {"item_code": "DOC_FORM_XII", "item_text": "Form XII (Particulars of Directors, Managers and Managing Agents)", "source_reference": "Companies Act 1994, Sec 115", "sort_order": 1},
                {"item_code": "DOC_FORM_IX", "item_text": "Form IX (Consent of Director to Act)", "source_reference": "Companies Act 1994, Sec 93", "sort_order": 2},
                {"item_code": "DOC_E_TIN", "item_text": "e-TIN and NID/Passport of Appointed/Existing Directors", "source_reference": "RJSC Citizen Charter 2025", "sort_order": 3},
                {"item_code": "DOC_BOARD_RES", "item_text": "Board Resolution for Change/Confirmation in Directorship", "source_reference": "Companies Act 1994", "sort_order": 4},
            ]
        elif "society" in s_id and "test" not in s_id:
            items_to_create = [
                {"item_code": "DOC_SOC_REG_MOA", "item_text": "Memorandum of Association & Society Name/Objects", "source_reference": "SRA 1860, Sec 2", "sort_order": 1},
                {"item_code": "DOC_SOC_REG_GOV_BODY", "item_text": "Names, addresses and occupations of governing body", "source_reference": "SRA 1860, Sec 2", "sort_order": 2},
                {"item_code": "DOC_SOC_REG_RULES", "item_text": "Rules and Regulations certified by at least 3 governing members", "source_reference": "SRA 1860, Sec 2", "sort_order": 3},
            ]
        elif ("incorporation" in s_id or "company-registration" in s_id) and "test" not in s_id:
            items_to_create = [
                {"item_code": "DOC_MOA_AOA", "item_text": "Memorandum and Articles of Association", "source_reference": "Companies Act 1994", "sort_order": 1},
                {"item_code": "DOC_FORM_I", "item_text": "Form I (Declaration on Compliance)", "source_reference": "Companies Act 1994", "sort_order": 2},
                {"item_code": "DOC_FORM_VI", "item_text": "Form VI (Notice of Situation of Registered Office)", "source_reference": "Companies Act 1994", "sort_order": 3},
                {"item_code": "DOC_FORM_IX", "item_text": "Form IX (Consent of Director to Act)", "source_reference": "Companies Act 1994", "sort_order": 4},
                {"item_code": "DOC_FORM_XII", "item_text": "Form XII (Particulars of Directors)", "source_reference": "Companies Act 1994", "sort_order": 5},
                {"item_code": "DOC_NAME_CLEARANCE", "item_text": "Name Clearance Approval Letter", "source_reference": "RJSC Online Portal", "sort_order": 6},
            ]
        else:
            return

    # Check client master documents for automatic linkage
    client_docs = db.query(Document).filter(Document.client_id == work.client_id).all()

    for item_data in items_to_create:
        code = (item_data.get("item_code") or "").upper()
        text = (item_data.get("item_text") or "").lower()

        matched_doc = None
        for d in client_docs:
            d_name = (d.document_name or "").lower()
            d_cat = (d.category or "").upper()
            if code and (code in d_cat or d_cat in code):
                matched_doc = d
                break
            if ("xii" in code or "xii" in text) and ("xii" in d_name or "xii" in d_cat):
                matched_doc = d
                break
            if ("sched" in code or "sched" in text) and ("sched" in d_name or "sched" in d_cat):
                matched_doc = d
                break
            if ("incorporation" in text or "cert" in code) and ("incorporation" in d_name or "incorporation" in d_cat):
                matched_doc = d
                break
            if ("moa" in text or "moa" in code) and ("moa" in d_name or "moa" in d_cat):
                matched_doc = d
                break

        status = "PENDING"
        completed_at = None
        completed_by = None
        if matched_doc:
            if matched_doc.status == "VERIFIED":
                status = "VERIFIED"
                completed_at = matched_doc.updated_at
                completed_by = "Master Client Profile"
            elif matched_doc.status == "OUTDATED":
                status = "OUTDATED"
            else:
                status = "RECEIVED"
                completed_at = matched_doc.updated_at
                completed_by = "Client Master Document"

        checklist_obj = WorkChecklist(
            work_id=work.id,
            item_code=item_data.get("item_code"),
            item_text=item_data.get("item_text"),
            status=status,
            source_reference=item_data.get("source_reference"),
            sort_order=item_data.get("sort_order", 0),
            completed_at=completed_at,
            completed_by=completed_by
        )
        db.add(checklist_obj)

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

    populate_work_checklist(db, db_work, work_in.rule_snapshot)

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

    # Status lifecycle timestamps
    new_status = update_data.get("status")
    if new_status:
        if new_status == "Submitted" and not work.submitted_at and "submitted_at" not in update_data:
            work.submitted_at = datetime.utcnow()
        elif new_status in ["Delivered", "Closed", "Completed"] and not work.completed_at and "completed_at" not in update_data:
            work.completed_at = datetime.utcnow()

    for key, value in update_data.items():
        setattr(work, key, value)

    if work.government_fee is not None:
        work.total_bill = (work.professional_fee or 0) + work.government_fee + (work.other_cost or 0)
    else:
        work.total_bill = None

    try:
        db.commit()
        db.refresh(work)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update work")

    return work

class ChecklistItemCreate(BaseModel):
    item_text: str
    item_code: Optional[str] = None
    status: Optional[str] = "PENDING"
    source_reference: Optional[str] = None
    sort_order: Optional[int] = 0

class ChecklistItemRead(BaseModel):
    id: UUID
    work_id: UUID
    item_code: Optional[str] = None
    item_text: str
    status: str
    source_reference: Optional[str] = None
    sort_order: int
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ChecklistItemUpdate(BaseModel):
    status: Optional[str] = None
    item_text: Optional[str] = None
    completed_by: Optional[str] = None

@router.get("/{work_id}/checklist", response_model=List[ChecklistItemRead])
def get_checklist(work_id: UUID, db: Session = Depends(get_db)):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    stmt = select(WorkChecklist).where(WorkChecklist.work_id == work_id).order_by(WorkChecklist.sort_order)
    return db.execute(stmt).scalars().all()

@router.post("/{work_id}/checklist", response_model=ChecklistItemRead)
def add_checklist_item(
    work_id: UUID,
    payload: ChecklistItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    if current_user.role == RoleEnum.JUNIOR.value and getattr(work, "review_status", "DRAFT") not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
        raise HTTPException(status_code=403, detail="Cannot edit checklist under review")

    max_order = db.query(func.max(WorkChecklist.sort_order)).filter(WorkChecklist.work_id == work_id).scalar() or 0
    item = WorkChecklist(
        work_id=work_id,
        item_code=payload.item_code,
        item_text=payload.item_text,
        status=payload.status or "PENDING",
        source_reference=payload.source_reference,
        sort_order=payload.sort_order if payload.sort_order else (max_order + 1),
        completed_at=datetime.utcnow() if payload.status in ["COMPLETED", "VERIFIED", "RECEIVED"] else None,
        completed_by=current_user.name if payload.status in ["COMPLETED", "VERIFIED", "RECEIVED"] else None
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.patch("/{work_id}/checklist/{item_id}", response_model=ChecklistItemRead)
def update_checklist_item(
    work_id: UUID,
    item_id: UUID,
    payload: ChecklistItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.get(WorkChecklist, item_id)
    if not item or item.work_id != work_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    work = db.get(Work, work_id)
    if current_user.role == RoleEnum.JUNIOR.value and getattr(work, "review_status", "DRAFT") not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
        raise HTTPException(status_code=403, detail="Cannot edit checklist under review")

    if payload.status is not None:
        item.status = payload.status
        if payload.status in ["COMPLETED", "VERIFIED", "RECEIVED"]:
            if not item.completed_at:
                item.completed_at = datetime.utcnow()
            if not item.completed_by:
                item.completed_by = current_user.name
        else:
            item.completed_at = None
            item.completed_by = None

    if payload.item_text is not None:
        item.item_text = payload.item_text

    if payload.completed_by is not None:
        item.completed_by = payload.completed_by

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{work_id}/checklist/{item_id}")
def delete_checklist_item(
    work_id: UUID,
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.get(WorkChecklist, item_id)
    if not item or item.work_id != work_id:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    work = db.get(Work, work_id)
    if current_user.role == RoleEnum.JUNIOR.value and getattr(work, "review_status", "DRAFT") not in ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"]:
        raise HTTPException(status_code=403, detail="Cannot edit checklist under review")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Checklist item deleted"}

@router.post("/{work_id}/checklist/generate")
def generate_checklist(
    work_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    populate_work_checklist(db, work)
    db.commit()
    items = db.execute(select(WorkChecklist).where(WorkChecklist.work_id == work_id).order_by(WorkChecklist.sort_order)).scalars().all()
    return items

@router.get("/{work_id}/financial-summary")
def get_work_financial_summary(work_id: UUID, db: Session = Depends(get_db)):
    from app.models.finance import Invoice, Transaction

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
        work.status = "Under Review"

    elif action == "RETURN_BY_SENIOR":
        if role not in [RoleEnum.SENIOR.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_SENIOR":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "RETURNED_BY_SENIOR"
        work.status = "In Preparation"

    elif action == "APPROVE_BY_SENIOR":
        if role not in [RoleEnum.SENIOR.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_SENIOR":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "SUBMITTED_TO_MANAGER"
        work.status = "Under Review"

    elif action == "RETURN_BY_MANAGER":
        if role not in [RoleEnum.MANAGER.value, RoleEnum.ADMIN.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_MANAGER":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "RETURNED_BY_MANAGER"
        work.status = "In Preparation"

    elif action == "FINAL_APPROVE":
        if role not in [RoleEnum.MANAGER.value, RoleEnum.ADMIN.value]:
            raise HTTPException(status_code=403, detail="Role cannot perform this action")
        if current_status != "SUBMITTED_TO_MANAGER":
            raise HTTPException(status_code=409, detail="Invalid transition")
        new_status = "APPROVED"
        work.status = "Ready for Submission"

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
