from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from typing import List, Optional, Any, Dict
from uuid import UUID
from datetime import datetime, date, timedelta, timezone
import copy

from app.db.session import get_db
from app.models.work import Work
from app.models.client import Client
from app.models.working_paper import WorkingPaper
from app.models.corporate_history import (
    CapitalHistory, RegisteredOfficeHistory, ClientNameHistory,
    Director, Shareholder, AgmHistory, AnnualReturnHistory
)
from app.models.document import Document
from app.models.user import User, RoleEnum
from app.api.deps import get_current_user
from app.schemas.working_paper import (
    WorkingPaperCreate, WorkingPaperUpdate, WorkingPaperRead, WorkingPaperReviewAction
)

router = APIRouter()

def _add_days(d: Optional[date], days: int) -> Optional[str]:
    if not d:
        return None
    return (d + timedelta(days=days)).isoformat()

def build_working_paper_snapshot(db: Session, work: Work, user_name: Optional[str] = None) -> Dict[str, Any]:
    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # 1. Company Data
    latest_office = db.query(RegisteredOfficeHistory).filter(
        RegisteredOfficeHistory.client_id == client.id
    ).order_by(desc(RegisteredOfficeHistory.effective_from), desc(RegisteredOfficeHistory.created_at)).first()

    latest_capital = db.query(CapitalHistory).filter(
        CapitalHistory.client_id == client.id
    ).order_by(desc(CapitalHistory.effective_date), desc(CapitalHistory.created_at)).first()

    latest_name = db.query(ClientNameHistory).filter(
        ClientNameHistory.client_id == client.id
    ).order_by(desc(ClientNameHistory.effective_date), desc(ClientNameHistory.created_at)).first()

    registered_office = latest_office.address if latest_office else (client.registered_office_text or "")
    former_name = latest_name.previous_name if latest_name else client.former_name

    company_data = {
        "legal_name": client.legal_name,
        "registration_no": client.registration_no or "",
        "entity_type": client.entity_type.value if hasattr(client.entity_type, "value") else str(client.entity_type),
        "incorporation_date": client.incorporation_date.isoformat() if client.incorporation_date else None,
        "former_name": former_name or "",
        "registered_office": registered_office,
        "tin": client.tin or "",
        "bin": client.bin or "",
        "authorized_capital": float(latest_capital.authorized_capital) if latest_capital else None,
        "paid_up_capital": float(latest_capital.paid_up_capital) if latest_capital else None,
        "sources": {
            "legal_name": "Client Master Record",
            "registration_no": "Certificate of Incorporation / RJSC Master" if client.registration_no else "Missing",
            "incorporation_date": "Certificate of Incorporation" if client.incorporation_date else "Missing",
            "registered_office": "Form VI / Registered Office History" if latest_office else "Master Profile Text",
            "capital": "Capital History Record" if latest_capital else "Unverified"
        }
    }

    # 2. Directors Data
    directors = db.query(Director).filter(
        Director.client_id == client.id
    ).order_by(desc(Director.is_current), Director.appointment_date.desc().nulls_last()).all()

    directors_data = []
    for d in directors:
        change_text = "Continuing" if d.is_current else (
            f"Ceased on {d.cessation_date.isoformat()}" if d.cessation_date else "Historical (Ceased)"
        )
        directors_data.append({
            "id": str(d.id),
            "full_name": d.full_name,
            "former_name": "",
            "designation": d.designation or "Director",
            "nationality": "Bangladeshi",
            "nationality_of_origin": "",
            "residential_address": registered_office,
            "occupation": d.designation or "Business",
            "nid_or_passport": d.nid_or_passport_reference or "",
            "appointment_date": d.appointment_date.isoformat() if d.appointment_date else "",
            "cessation_date": d.cessation_date.isoformat() if d.cessation_date else "",
            "is_current": d.is_current,
            "source_document": d.source_document or "Form XII / Client Master",
            "changes": change_text
        })

    # 3. Shareholders Data
    shareholders = db.query(Shareholder).filter(
        Shareholder.client_id == client.id
    ).order_by(desc(Shareholder.is_current), desc(Shareholder.share_count)).all()

    shareholders_data = []
    for s in shareholders:
        shareholders_data.append({
            "id": str(s.id),
            "shareholder_name": s.shareholder_name,
            "share_count": float(s.share_count),
            "share_value": float(s.share_value),
            "total_value": float(s.share_count * s.share_value),
            "ownership_percentage": float(s.ownership_percentage) if s.ownership_percentage is not None else None,
            "is_current": s.is_current,
            "source_document": s.source_document or "Schedule X / Member Register"
        })

    # 4. AGM, Audit/DVC, and Annual Return Analysis Worksheet
    agms = db.query(AgmHistory).filter(
        AgmHistory.client_id == client.id
    ).order_by(desc(AgmHistory.financial_year)).all()

    annual_returns = db.query(AnnualReturnHistory).filter(
        AnnualReturnHistory.client_id == client.id
    ).order_by(desc(AnnualReturnHistory.financial_year)).all()

    agm_map = {a.financial_year: a for a in agms}
    ar_map = {r.financial_year: r for r in annual_returns}

    all_years = sorted(list(set(list(agm_map.keys()) + list(ar_map.keys()))), reverse=True)
    if not all_years:
        filing_yr = work.period_or_year or "2023-2024"
        all_years = [filing_yr]

    agm_analysis = []
    for idx, fy in enumerate(all_years):
        agm_rec = agm_map.get(fy)
        ar_rec = ar_map.get(fy)

        prev_fy = all_years[idx + 1] if idx + 1 < len(all_years) else None
        prev_agm_rec = agm_map.get(prev_fy) if prev_fy else None
        prev_agm_date_str = prev_agm_rec.agm_date.isoformat() if prev_agm_rec and prev_agm_rec.agm_date else None

        actual_agm_date_str = agm_rec.agm_date.isoformat() if agm_rec and agm_rec.agm_date else None
        actual_agm_status = agm_rec.status if agm_rec else "EVIDENCE_PENDING"

        # Separate Audit & DVC (never conflated with AGM)
        audit_date_str = None
        dvc_ref = None
        dvc_date_str = None

        ar_filed_date_str = ar_rec.filed_date.isoformat() if ar_rec and ar_rec.filed_date else None
        rjsc_ack = ar_rec.acknowledgement_reference if ar_rec else None

        # Statutory Deadline Calculations (Companies Act 1994, Sec 81 & Sec 36)
        statutory_filing_deadline = None
        calculation_notes = []
        compliance_assessment = "REVIEW_REQUIRED"
        missing_evidence = []

        if actual_agm_date_str and agm_rec and agm_rec.agm_date:
            # Under Companies Act 1994, Sec 36: Annual return filed within 21 days after AGM
            statutory_filing_deadline = _add_days(agm_rec.agm_date, 21)
            calculation_notes.append("Sec 36(1): Schedule X filing deadline = AGM date + 21 days.")
            compliance_assessment = "COMPLIANT" if ar_filed_date_str else "PENDING_FILING"
        else:
            missing_evidence.append("Actual AGM date is not yet evidenced from signed minutes or notice.")
            calculation_notes.append("Filing deadline calculation pending verified AGM date.")
            compliance_assessment = "REVIEW_REQUIRED"

        # Distinction rule: DVC/audit report cannot prove AGM
        calculation_notes.append("Statutory Principle: Audit/DVC date does not constitute evidence of AGM.")

        suggested_action = (
            "Ready for Schedule X & Annual Return drafting"
            if compliance_assessment == "COMPLIANT" or compliance_assessment == "PENDING_FILING"
            else "Verify signed AGM minutes from company records"
        )

        agm_analysis.append({
            "financial_year": fy,
            "previous_agm_date": prev_agm_date_str,
            "previous_agm_source": f"FY {prev_fy} AGM Record" if prev_agm_date_str else "Unverified",
            "actual_agm_date": actual_agm_date_str,
            "agm_status": actual_agm_status,
            "agm_evidence": agm_rec.source_document if agm_rec else "Pending verification",
            "audit_report_date": audit_date_str,
            "dvc_reference": dvc_ref,
            "dvc_date": dvc_date_str,
            "annual_return_period": fy,
            "annual_return_filed_date": ar_filed_date_str,
            "rjsc_ack_ref": rjsc_ack,
            "statutory_agm_deadline": None,  # Kept null unless verified FY end + prev AGM verified
            "statutory_filing_deadline": statutory_filing_deadline,
            "calculation_basis": " | ".join(calculation_notes),
            "compliance_assessment": compliance_assessment,
            "missing_or_conflicting_evidence": missing_evidence,
            "suggested_next_action": suggested_action
        })

    # 5. Linked Documents (distinguishing Client Legal Documents vs Work-Specific Supporting Documents)
    client_docs = db.query(Document).filter(
        Document.client_id == client.id
    ).order_by(desc(Document.created_at)).all()

    linked_documents = []
    for doc in client_docs:
        doc_scope = "WORK_SUPPORTING_DOC" if doc.work_id == work.id else "CLIENT_LEGAL_DOC"
        linked_documents.append({
            "id": str(doc.id),
            "document_name": doc.document_name,
            "category": doc.category,
            "scope": doc_scope,
            "status": doc.status,
            "uploaded_at": doc.created_at.isoformat() if doc.created_at else None
        })

    # 6. Detected Missing Fields & Conflicts
    missing_fields = []
    if not client.registration_no:
        missing_fields.append({
            "field": "registration_no",
            "message": "Missing official RJSC registration number.",
            "severity": "WARNING"
        })
    if not client.incorporation_date:
        missing_fields.append({
            "field": "incorporation_date",
            "message": "Missing verified incorporation date.",
            "severity": "WARNING"
        })
    if not registered_office:
        missing_fields.append({
            "field": "registered_office",
            "message": "Missing registered office address in Master records.",
            "severity": "WARNING"
        })
    current_dirs = [d for d in directors if d.is_current]
    if len(current_dirs) == 0:
        missing_fields.append({
            "field": "directors",
            "message": "Zero active directors recorded in Master records.",
            "severity": "ERROR"
        })
    elif len(current_dirs) < 2 and client.entity_type == "PRIVATE_COMPANY":
        missing_fields.append({
            "field": "directors",
            "message": "Fewer than statutory minimum 2 directors for Private Limited Company.",
            "severity": "WARNING"
        })
    if not shareholders_data:
        missing_fields.append({
            "field": "shareholders",
            "message": "Shareholder register is empty in Master records.",
            "severity": "WARNING"
        })

    # 7. Initial Forms Data (Form XII and Schedule X pre-populated)
    forms_data = {
        "form_xii": {
            "name": client.legal_name,
            "registration": client.registration_no or "",
            "presented_by": user_name or work.assigned_to or "ZA Corporate Desk",
            "dated": date.today().isoformat(),
            "designation": "Director / Managing Director",
            "directors": copy.deepcopy(directors_data)
        },
        "schedule_x": {
            "company_name": client.legal_name,
            "registration_no": client.registration_no or "",
            "financial_year": work.period_or_year or "2023-2024",
            "authorized_capital": float(latest_capital.authorized_capital) if latest_capital else 0,
            "paid_up_capital": float(latest_capital.paid_up_capital) if latest_capital else 0,
            "total_shares": sum(s["share_count"] for s in shareholders_data) if shareholders_data else 0,
            "directors_count": len(current_dirs),
            "shareholders_count": len(shareholders_data)
        }
    }

    return {
        "company_data": company_data,
        "directors_data": directors_data,
        "shareholders_data": shareholders_data,
        "agm_analysis": agm_analysis,
        "forms_data": forms_data,
        "linked_documents": linked_documents,
        "missing_fields": missing_fields
    }

@router.get("", response_model=List[WorkingPaperRead])
def list_working_papers(
    work_id: Optional[UUID] = Query(None),
    client_id: Optional[UUID] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(WorkingPaper)
    if work_id:
        query = query.filter(WorkingPaper.work_id == work_id)
    if client_id:
        query = query.filter(WorkingPaper.client_id == client_id)
    return query.order_by(desc(WorkingPaper.created_at)).all()

@router.get("/{paper_id}", response_model=WorkingPaperRead)
def get_working_paper(paper_id: UUID, db: Session = Depends(get_db)):
    wp = db.get(WorkingPaper, paper_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Working paper not found")
    return wp

@router.post("/work/{work_id}/init", response_model=WorkingPaperRead)
def init_work_working_paper(
    work_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    # Check if a working paper already exists for this work
    existing = db.query(WorkingPaper).filter(WorkingPaper.work_id == work_id).first()
    if existing:
        return existing

    # Auto-generate snapshot from Client Master
    user_name = current_user.name if hasattr(current_user, "name") else "Staff"
    snapshot = build_working_paper_snapshot(db, work, user_name)

    client = db.get(Client, work.client_id)
    client_name = client.legal_name if client else "Company"

    wp = WorkingPaper(
        work_id=work.id,
        client_id=work.client_id,
        title=f"Working Paper — {work.service_id.replace('-', ' ').title()} ({work.period_or_year or 'Annual'})",
        paper_type="ANNUAL_RETURN_COMPLIANCE" if "return" in work.service_id.lower() else "GENERAL_COMPLIANCE",
        filing_year=work.period_or_year or "2023-2024",
        status="DRAFT",
        prepared_by=user_name,
        company_data=snapshot["company_data"],
        directors_data=snapshot["directors_data"],
        shareholders_data=snapshot["shareholders_data"],
        agm_analysis=snapshot["agm_analysis"],
        forms_data=snapshot["forms_data"],
        linked_documents=snapshot["linked_documents"],
        missing_fields=snapshot["missing_fields"],
        notes=f"Auto-initialized from Client Master for {client_name}."
    )
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

@router.post("", response_model=WorkingPaperRead)
def create_working_paper(
    payload: WorkingPaperCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, payload.work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    user_name = current_user.name if hasattr(current_user, "name") else "Staff"
    snapshot = build_working_paper_snapshot(db, work, user_name)

    wp = WorkingPaper(
        work_id=payload.work_id,
        client_id=payload.client_id,
        title=payload.title,
        paper_type=payload.paper_type,
        filing_year=payload.filing_year or work.period_or_year,
        status=payload.status or "DRAFT",
        prepared_by=payload.prepared_by or user_name,
        company_data=payload.company_data if payload.company_data is not None else snapshot["company_data"],
        directors_data=payload.directors_data if payload.directors_data is not None else snapshot["directors_data"],
        shareholders_data=payload.shareholders_data if payload.shareholders_data is not None else snapshot["shareholders_data"],
        agm_analysis=payload.agm_analysis if payload.agm_analysis is not None else snapshot["agm_analysis"],
        forms_data=payload.forms_data if payload.forms_data is not None else snapshot["forms_data"],
        linked_documents=payload.linked_documents if payload.linked_documents is not None else snapshot["linked_documents"],
        missing_fields=payload.missing_fields if payload.missing_fields is not None else snapshot["missing_fields"],
        notes=payload.notes
    )
    db.add(wp)
    db.commit()
    db.refresh(wp)
    return wp

@router.patch("/{paper_id}", response_model=WorkingPaperRead)
def update_working_paper(
    paper_id: UUID,
    payload: WorkingPaperUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wp = db.get(WorkingPaper, paper_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Working paper not found")

    update_dict = payload.model_dump(exclude_unset=True)
    for k, v in update_dict.items():
        setattr(wp, k, v)

    db.commit()
    db.refresh(wp)
    return wp

@router.post("/{paper_id}/refresh", response_model=WorkingPaperRead)
def refresh_working_paper_from_master(
    paper_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wp = db.get(WorkingPaper, paper_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Working paper not found")

    work = db.get(Work, wp.work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    user_name = current_user.name if hasattr(current_user, "name") else "Staff"
    snapshot = build_working_paper_snapshot(db, work, user_name)

    # Refresh while preserving user notes and prepared_by
    wp.company_data = snapshot["company_data"]
    wp.directors_data = snapshot["directors_data"]
    wp.shareholders_data = snapshot["shareholders_data"]
    wp.agm_analysis = snapshot["agm_analysis"]
    wp.linked_documents = snapshot["linked_documents"]
    wp.missing_fields = snapshot["missing_fields"]
    wp.forms_data = snapshot["forms_data"]

    db.commit()
    db.refresh(wp)
    return wp

@router.post("/{paper_id}/review-action", response_model=WorkingPaperRead)
def apply_working_paper_review_action(
    paper_id: UUID,
    payload: WorkingPaperReviewAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    wp = db.get(WorkingPaper, paper_id)
    if not wp:
        raise HTTPException(status_code=404, detail="Working paper not found")

    user_name = current_user.name if hasattr(current_user, "name") else "User"
    action = payload.action

    if action == "SUBMIT_FOR_REVIEW":
        wp.status = "IN_REVIEW"
        wp.prepared_by = wp.prepared_by or user_name
    elif action == "APPROVE":
        if current_user.role not in [RoleEnum.SENIOR.value, RoleEnum.MANAGER.value, RoleEnum.ADMIN.value]:
            raise HTTPException(status_code=403, detail="Role not authorized to approve working papers")
        wp.status = "APPROVED"
        wp.approved_by = user_name
        wp.reviewed_by = wp.reviewed_by or user_name
        wp.reviewed_at = datetime.now(timezone.utc)
    elif action == "RETURN_TO_DRAFT":
        wp.status = "DRAFT"
        wp.reviewed_by = user_name
    else:
        raise HTTPException(status_code=400, detail="Invalid review action")

    if payload.notes:
        existing_notes = wp.notes or ""
        wp.notes = f"{existing_notes}\n[{action} by {user_name} on {date.today().isoformat()}]: {payload.notes}".strip()

    db.commit()
    db.refresh(wp)
    return wp
