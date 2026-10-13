import uuid
from typing import List, Dict, Any, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ...db.session import get_db
from ..deps import get_current_user
from ...models.user import User
from ...models.client import Client
from ...models.work import Work, WorkChecklist
from ...models.corporate_history import AnnualReturnHistory, AgmHistory, Director, Shareholder, CapitalHistory
from ...models.working_paper import WorkingPaper
from ...services.evidence_verification import is_official_rjsc_acknowledgement, has_verified_filing_document
from .works import generate_work_code

router = APIRouter(prefix="/annual-returns", tags=["Annual Returns Service"])

class AnnualReturnWorkCreateRequest(BaseModel):
    financial_years: List[str]
    assigned_to: Optional[str] = None
    professional_fee: Optional[float] = 0.0
    notes: Optional[str] = None

def get_financial_years_range(incorp_date: Optional[date]) -> List[str]:
    """
    Returns Bangladesh financial years (July to June) from incorporation to current FY.
    Example: '2020-2021', '2021-2022', '2022-2023', '2023-2024'.
    """
    today = date.today()
    current_fy_end = today.year if today.month < 7 else today.year + 1
    start_year = (incorp_date.year - (1 if incorp_date.month < 7 else 0)) if (incorp_date and incorp_date.year >= 1990) else (current_fy_end - 5)
    
    # Cap range to a maximum of 25 years
    if current_fy_end - start_year > 25:
        start_year = current_fy_end - 25

    years = []
    for y in range(start_year, current_fy_end):
        years.append(f"{y}-{y+1}")
    return sorted(years, reverse=True)

@router.get("/assessment/{client_id}")
def get_annual_return_assessment(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates client compliance for all financial years under Companies Act 1994:
    - Section 36(1): Schedule X filing deadline is 21 calendar days from the date of the AGM.
    - Tracks separate actual AGM date, Audit report date, DVC date, and RJSC filing date.
    - Detects filed, pending, overdue, and evidence-uncertain years.
    - Computes statutory delay and applicable late fees.
    """
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    ar_records = db.query(AnnualReturnHistory).filter(
        AnnualReturnHistory.client_id == client_id
    ).order_by(desc(AnnualReturnHistory.financial_year)).all()

    agm_records = db.query(AgmHistory).filter(
        AgmHistory.client_id == client_id
    ).order_by(desc(AgmHistory.financial_year)).all()

    ar_by_year: Dict[str, AnnualReturnHistory] = {r.financial_year: r for r in ar_records}
    agm_by_year: Dict[str, AgmHistory] = {a.financial_year: a for a in agm_records}

    all_years = get_financial_years_range(client.incorporation_date)
    # Include any existing records not in the auto range
    for y in ar_by_year.keys():
        if y not in all_years:
            all_years.append(y)
    for y in agm_by_year.keys():
        if y not in all_years:
            all_years.append(y)
    all_years = sorted(list(set(all_years)), reverse=True)

    today = date.today()
    assessment_list = []
    filed_count = 0
    pending_count = 0
    overdue_count = 0
    uncertain_count = 0

    for fy in all_years:
        ar = ar_by_year.get(fy)
        agm = agm_by_year.get(fy)

        actual_agm_date = None
        if ar and ar.actual_agm_date:
            actual_agm_date = ar.actual_agm_date
        elif agm and agm.agm_date and agm.status == "HELD":
            actual_agm_date = agm.agm_date

        audit_report_date = ar.audit_report_date if ar else None
        dvc_date = ar.dvc_date if ar else None
        dvc_code = ar.dvc_code if ar else None
        filed_date = ar.filed_date if ar else None
        ack_ref = ar.acknowledgement_reference if ar else None
        source_ev = ar.source_evidence if ar else (agm.source_document if agm else None)

        # Statutory Sec 36 deadline: 21 calendar days after AGM
        due_date = ar.due_date if (ar and ar.due_date) else None
        if not due_date and actual_agm_date:
            due_date = actual_agm_date + timedelta(days=21)

        delay_days = 0
        status_val = "EVIDENCE_UNCERTAIN"
        evidence_status = "EVIDENCE_UNCERTAIN"

        if filed_date:
            status_val = "FILED"
            filed_count += 1
            # Provenance / Acknowledgment verification:
            # Merely having a filed_date does NOT make evidence VERIFIED.
            # Require a reviewed official RJSC acknowledgment or verified filing document with provenance.
            if is_official_rjsc_acknowledgement(ack_ref) or has_verified_filing_document(db, client.id, source_ev, ar.work_id if ar else None):
                evidence_status = "VERIFIED"
            else:
                evidence_status = "REVIEW_REQUIRED"

            if due_date and filed_date > due_date:
                delay_days = (filed_date - due_date).days
        elif actual_agm_date and due_date:
            if today > due_date:
                status_val = "OVERDUE"
                delay_days = (today - due_date).days
                overdue_count += 1
            else:
                status_val = "PENDING"
                pending_count += 1
            evidence_status = "PENDING_REVIEW" if (source_ev or (agm and agm.source_document)) else "EVIDENCE_UNCERTAIN"
        else:
            status_val = "EVIDENCE_UNCERTAIN"
            evidence_status = "EVIDENCE_UNCERTAIN"
            uncertain_count += 1

        # Statutory Late Fee Remediation:
        # Unapproved hardcoded formula (delay_days * 10) is removed.
        # Return "REVIEW_REQUIRED" for overdue/delayed filings until legally validated fee rules are configured.
        if delay_days > 0:
            statutory_late_fee = "REVIEW_REQUIRED"
        else:
            statutory_late_fee = 0.0

        statutory_notes = []
        if actual_agm_date and due_date:
            statutory_notes.append(f"Sec 36 Deadline: {due_date.isoformat()} (AGM {actual_agm_date.isoformat()} + 21 days)")
        else:
            statutory_notes.append("Actual AGM date unverified; filing deadline pending signed AGM minutes (cannot be inferred from financial year or audit date).")

        if dvc_code:
            statutory_notes.append(f"Audit DVC verified: {dvc_code}")

        if filed_date and evidence_status == "REVIEW_REQUIRED":
            statutory_notes.append("Filing unevidenced: Missing official RJSC acknowledgment reference or source proof (REVIEW_REQUIRED).")

        if delay_days > 0:
            statutory_notes.append(f"Delayed by {delay_days} days. Statutory late fee: REVIEW_REQUIRED (statutory penalty schedule requires legal validation).")

        assessment_list.append({
            "financial_year": fy,
            "actual_agm_date": actual_agm_date.isoformat() if actual_agm_date else None,
            "audit_report_date": audit_report_date.isoformat() if audit_report_date else None,
            "dvc_date": dvc_date.isoformat() if dvc_date else None,
            "dvc_code": dvc_code,
            "due_date": due_date.isoformat() if due_date else None,
            "filed_date": filed_date.isoformat() if filed_date else None,
            "filing_status": status_val,
            "evidence_status": evidence_status,
            "delay_days": delay_days,
            "statutory_late_fee": statutory_late_fee,
            "acknowledgement_reference": ack_ref,
            "source_evidence": source_ev,
            "statutory_basis": " | ".join(statutory_notes),
            "bundled_forms": ["FORM_XII", "SCHEDULE_X", "FORM_23B"],
            "existing_history_id": str(ar.id) if ar else None,
            "work_id": str(ar.work_id) if (ar and ar.work_id) else None
        })

    return {
        "client_id": str(client.id),
        "legal_name": client.legal_name,
        "registration_no": client.registration_no,
        "incorporation_date": client.incorporation_date.isoformat() if client.incorporation_date else None,
        "total_years_assessed": len(assessment_list),
        "filed_count": filed_count,
        "pending_count": pending_count,
        "overdue_count": overdue_count,
        "uncertain_count": uncertain_count,
        "statutory_rule": "The Companies Act, 1994 — Section 36(1) Schedule X filing within 21 days after AGM; Section 81 AGM deadline.",
        "assessment": assessment_list
    }

@router.post("/create-work/{client_id}")
def create_annual_return_work(
    client_id: uuid.UUID,
    payload: AnnualReturnWorkCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates an integrated Annual Return Work order for selected financial year(s)
    without duplicating the Client Master record.
    Bundles Form XII, Schedule X, and Form 23B in statutory checklist and working papers.
    """
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not payload.financial_years:
        raise HTTPException(status_code=400, detail="At least one financial year must be selected")

    years_str = ", ".join(payload.financial_years) if len(payload.financial_years) > 1 else payload.financial_years[0]
    work_code = generate_work_code(db)

    work = Work(
        work_code=work_code,
        client_id=client_id,
        service_id="annual-return",
        entity_type=client.entity_type.value if hasattr(client.entity_type, "value") else str(client.entity_type),
        period_or_year=years_str,
        assigned_to=payload.assigned_to or current_user.name or current_user.email,
        status="PENDING",
        review_status="DRAFT",
        professional_fee=payload.professional_fee or 0.0,
        notes=payload.notes or f"Annual return filing for financial year(s): {years_str}"
    )
    db.add(work)
    db.flush()

    # Create Statutory Checklist items
    checklist_items = [
        ("Verify Signed AGM Minutes & Attendance Record", "Section 81 Companies Act, 1994"),
        ("Verify Audited Financial Statements with DVC Document Code", "ICAB / RJSC DVC Guideline"),
        ("Draft Form XII (Particulars of Directors and Officers)", "Section 115 Companies Act, 1994"),
        ("Draft Schedule X (Annual Summary of Share Capital & Members)", "Section 36 Companies Act, 1994"),
        ("Draft Form 23B (Statutory Notice of Auditor Appointment)", "Section 210(2) Companies Act, 1994"),
        ("Internal Partner Review & Client Approval Sign-off", "ZA Quality Assurance Standard"),
        ("Manual RJSC Portal Upload & Government Challan Payment", "RJSC e-Services Portal Manual Filing"),
        ("Record RJSC Acknowledgement Number & Delivery to Client", "Office Registry Follow-up")
    ]

    for idx, (text, src) in enumerate(checklist_items):
        item = WorkChecklist(
            work_id=work.id,
            item_code=f"AR-CHK-{idx+1:02d}",
            item_text=text,
            status="PENDING",
            source_reference=src,
            sort_order=idx + 1
        )
        db.add(item)

    # Link/update annual return history records with this work_id
    for fy in payload.financial_years:
        existing_ar = db.query(AnnualReturnHistory).filter(
            AnnualReturnHistory.client_id == client_id,
            AnnualReturnHistory.financial_year == fy
        ).first()

        if existing_ar:
            existing_ar.work_id = work.id
        else:
            new_ar = AnnualReturnHistory(
                client_id=client_id,
                work_id=work.id,
                financial_year=fy,
                filing_status="PENDING",
                evidence_status="PENDING_REVIEW"
            )
            db.add(new_ar)

    db.commit()
    db.refresh(work)

    return {
        "message": f"Annual return work {work.work_code} created successfully",
        "work_id": str(work.id),
        "work_code": work.work_code,
        "financial_years": payload.financial_years,
        "service_id": work.service_id,
        "status": work.status
    }
