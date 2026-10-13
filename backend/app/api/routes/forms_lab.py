import os
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from ...db.session import get_db
from ..deps import get_current_user
from datetime import date, datetime, timedelta
from decimal import Decimal
from ...models.user import User, RoleEnum
from ...models.work import Work
from ...models.client import Client
from ...models.working_paper import WorkingPaper
from ...models.generated_form import GeneratedFormRecord
from ...models.corporate_history import MortgageChargeHistory, ShareTransferHistory, AnnualReturnHistory
from ...services.pdf.template_inventory import get_template_catalog, get_template_by_code
from ...services.pdf.forms_engine import generate_form_pdf
from .working_papers import build_working_paper_snapshot

router = APIRouter(prefix="/forms-lab", tags=["RJSC Forms Lab"])

class FormGenerateRequest(BaseModel):
    overrides: Optional[Dict[str, Any]] = None
    filing_by: Optional[str] = "Zahir & Associate (Chartered Accountants)"
    dated_str: Optional[str] = None
    actual_agm_date: Optional[str] = None
    auditor_name: Optional[str] = None
    effective_date: Optional[str] = None
    transferor_name: Optional[str] = None
    transferor_address: Optional[str] = None
    transferee_name: Optional[str] = None
    transferee_address: Optional[str] = None
    share_count: Optional[int] = None
    nominal_value: Optional[float] = None
    paid_up_per_share: Optional[float] = None
    consideration_amount: Optional[float] = None
    distinctive_from: Optional[int] = None
    distinctive_to: Optional[int] = None
    transfer_no: Optional[str] = None
    board_approval_date: Optional[str] = None
    # Mortgage / Charge parameters
    lender: Optional[str] = None
    secured_amount: Optional[float] = None
    instrument_type: Optional[str] = None
    instrument_date: Optional[str] = None
    property_description: Optional[str] = None
    modification_date: Optional[str] = None
    modification_details: Optional[str] = None
    satisfaction_date: Optional[str] = None

class FormReviewActionRequest(BaseModel):
    new_status: str  # DRAFT, REVIEWED, APPROVED_FOR_PORTAL_UPLOAD, ARCHIVED
    review_notes: Optional[str] = None

@router.get("/templates")
def list_template_inventory():
    """Returns the complete structured inventory of all 31 templates."""
    return get_template_catalog()

@router.get("/preflight/{work_id}/{form_code}")
def get_form_preflight(
    work_id: uuid.UUID,
    form_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Evaluates Work data against form requirements before generating PDF.
    Returns verified fields, missing data alerts, and proposed values.
    """
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    tmpl = get_template_by_code(form_code.upper().replace("-", "_"))
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Form code {form_code} not recognized in registry")

    # Fetch working paper or build on the fly
    wp = db.query(WorkingPaper).filter(WorkingPaper.work_id == work_id).first()
    if wp:
        snapshot = {
            "company_data": wp.company_data,
            "directors_data": wp.directors_data,
            "shareholders_data": wp.shareholders_data,
            "agm_analysis": wp.agm_analysis,
            "forms_data": wp.forms_data,
            "missing_fields": wp.missing_fields
        }
    else:
        snapshot = build_working_paper_snapshot(db, work)

    company = snapshot.get("company_data", {})
    directors = snapshot.get("directors_data", [])
    shareholders = snapshot.get("shareholders_data", [])

    verified_fields = []
    missing_fields = []
    warnings = []

    # Check required client fields
    for field in tmpl.get("required_client_fields", []):
        val = company.get(field)
        if val:
            verified_fields.append({"field": field, "value": str(val)})
        else:
            missing_fields.append(f"Company {field.replace('_', ' ')} is missing")

    # Form specific checks
    norm_code = tmpl["form_code"]
    if norm_code == "FORM_XII":
        if directors:
            verified_fields.append({"field": "directors_count", "value": f"{len(directors)} active directors"})
        else:
            missing_fields.append("No active directors recorded in Master register")
    elif norm_code == "SCHEDULE_X":
        if company.get("authorized_capital"):
            verified_fields.append({"field": "authorized_capital", "value": f"৳ {company.get('authorized_capital'):,}"})
        else:
            missing_fields.append("Authorized share capital missing")
        if company.get("paid_up_capital"):
            verified_fields.append({"field": "paid_up_capital", "value": f"৳ {company.get('paid_up_capital'):,}"})
        else:
            missing_fields.append("Paid-up share capital missing")

        # Shareholding cross-validation
        nom_val = float(company.get("nominal_value_per_share") or 100)
        paid_cap = float(company.get("paid_up_capital") or 0)
        issued_shares = int(paid_cap / nom_val) if nom_val else 0
        sum_sh_shares = sum(s.get("share_count", 0) for s in shareholders)
        if shareholders and issued_shares > 0 and sum_sh_shares != issued_shares:
            warnings.append(
                f"Shareholding mismatch: Sum of member shares ({sum_sh_shares:,}) does not equal issued shares derived from paid-up capital ({issued_shares:,}). Discrepancy flagged under Sec 36."
            )

        # Check AGM evidence
        has_evidenced_agm = False
        agm_rows = snapshot.get("agm_analysis", [])
        for row in agm_rows:
            if row.get("actual_agm_date"):
                has_evidenced_agm = True
                verified_fields.append({"field": "actual_agm_date", "value": row["actual_agm_date"]})
                break
        if not has_evidenced_agm:
            warnings.append("AGM date is unevidenced. Schedule X requires review or verified AGM date before submission.")
    elif norm_code == "FORM_117":
        if shareholders:
            verified_fields.append({"field": "transferor_candidate", "value": shareholders[0].get("shareholder_name", "—")})
            if len(shareholders) > 1:
                verified_fields.append({"field": "transferee_candidate", "value": shareholders[1].get("shareholder_name", "—")})
            else:
                warnings.append("Single shareholder recorded: Enter transferee details in filing parameters.")
        else:
            missing_fields.append("No recorded shareholders available as transferor candidate")
        st_rec = db.query(ShareTransferHistory).filter(ShareTransferHistory.work_id == work_id).first()
        if st_rec:
            verified_fields.append({"field": "transferor_name", "value": st_rec.transferor_name})
            verified_fields.append({"field": "transferee_name", "value": st_rec.transferee_name})
            verified_fields.append({"field": "share_count", "value": f"{float(st_rec.share_count):,.0f}"})
            verified_fields.append({"field": "consideration", "value": f"৳ {float(st_rec.consideration_amount):,}"})
            if st_rec.board_approval_date:
                verified_fields.append({"field": "board_approval_date", "value": st_rec.board_approval_date.isoformat()})
            else:
                warnings.append("Board resolution approval date pending before final RJSC upload.")
        else:
            warnings.append("Form 117 requires execution date and Board Resolution meeting date before upload.")
    elif norm_code in ["FORM_XVIII", "FORM_XIX", "FORM_XXVIII"]:
        charge = db.query(MortgageChargeHistory).filter(MortgageChargeHistory.work_id == work_id).first()
        if charge:
            verified_fields.append({"field": "charge_type", "value": charge.charge_type})
            verified_fields.append({"field": "lender", "value": charge.lender})
            verified_fields.append({"field": "secured_amount", "value": f"৳ {float(charge.secured_amount):,}"})
            if charge.instrument_date:
                verified_fields.append({"field": "instrument_date", "value": charge.instrument_date.isoformat()})
                if norm_code in ["FORM_XVIII", "FORM_XIX"] and not charge.registration_date:
                    if date.today() > charge.instrument_date + timedelta(days=21):
                        warnings.append("STATUTORY ALERT: Beyond 21 days from instrument date. High Court condonation of delay required under Section 171.")
                    else:
                        rem_days = (charge.instrument_date + timedelta(days=21) - date.today()).days
                        verified_fields.append({"field": "statutory_deadline", "value": f"{rem_days} days remaining"})
        else:
            warnings.append(f"No active Mortgage/Charge record found for this work. Enter lender and amount in parameters.")

    return {
        "form_code": norm_code,
        "form_title": tmpl["form_title"],
        "is_fillable": tmpl["status"] == "LIVE_AUTOFILL_READY",
        "verified_fields": verified_fields,
        "missing_fields": missing_fields,
        "warnings": warnings,
        "snapshot_preview": {
            "company_name": company.get("legal_name"),
            "registration_no": company.get("registration_no"),
            "registered_office": company.get("registered_office"),
            "directors_count": len(directors),
            "shareholders_count": len(shareholders)
        }
    }

def _clean_json_dict(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): _clean_json_dict(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_clean_json_dict(v) for v in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, (date, datetime)):
        return obj.isoformat()
    elif isinstance(obj, uuid.UUID):
        return str(obj)
    return obj

@router.post("/generate/{work_id}/{form_code}")
def generate_work_form_pdf(
    work_id: uuid.UUID,
    form_code: str,
    payload: FormGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates an upload-ready draft PDF from verified Work snapshot.
    Stores record in GeneratedFormRecord and returns file metadata.
    """
    work = db.query(Work).filter(Work.id == work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    wp = db.query(WorkingPaper).filter(WorkingPaper.work_id == work_id).first()
    if wp:
        snapshot = {
            "company_data": wp.company_data,
            "directors_data": wp.directors_data,
            "shareholders_data": wp.shareholders_data,
            "agm_analysis": wp.agm_analysis,
            "forms_data": wp.forms_data
        }
    else:
        snapshot = build_working_paper_snapshot(db, work)

    norm_code = form_code.upper().replace("-", "_")

    # Determine next version number
    current_max = db.query(func.max(GeneratedFormRecord.version)).filter(
        GeneratedFormRecord.work_id == work_id,
        GeneratedFormRecord.form_code == norm_code
    ).scalar() or 0
    next_version = current_max + 1

    options = payload.model_dump()
    options["version"] = next_version

    # Auto-fill mortgage fields if not provided in options
    if norm_code in ["FORM_XVIII", "FORM_XIX", "FORM_XXVIII"]:
        charge = db.query(MortgageChargeHistory).filter(MortgageChargeHistory.work_id == work_id).first()
        if charge:
            if not options.get("lender"): options["lender"] = charge.lender
            if not options.get("secured_amount"): options["secured_amount"] = float(charge.secured_amount)
            if not options.get("instrument_type"): options["instrument_type"] = charge.instrument_type
            if not options.get("instrument_date") and charge.instrument_date: options["instrument_date"] = charge.instrument_date.isoformat()
            if not options.get("property_description"): options["property_description"] = charge.property_description
            if not options.get("modification_details"): options["modification_details"] = charge.modification_details
            if norm_code == "FORM_XIX":
                if not options.get("original_instrument_date") and charge.creation_date:
                    options["original_instrument_date"] = charge.creation_date.isoformat()
                if not options.get("modification_date") and charge.modification_date:
                    options["modification_date"] = charge.modification_date.isoformat()
            if not options.get("satisfaction_date") and charge.satisfaction_date: options["satisfaction_date"] = charge.satisfaction_date.isoformat()

    # Auto-fill transfer fields if not provided in options
    if norm_code == "FORM_117":
        st_rec = db.query(ShareTransferHistory).filter(ShareTransferHistory.work_id == work_id).first()
        if st_rec:
            if not options.get("transferor_name"): options["transferor_name"] = st_rec.transferor_name
            if not options.get("transferor_address"): options["transferor_address"] = st_rec.transferor_address
            if not options.get("transferee_name"): options["transferee_name"] = st_rec.transferee_name
            if not options.get("transferee_address"): options["transferee_address"] = st_rec.transferee_address
            if not options.get("share_count"): options["share_count"] = int(st_rec.share_count)
            if not options.get("consideration_amount"): options["consideration_amount"] = float(st_rec.consideration_amount)
            if not options.get("distinctive_from"): options["distinctive_from"] = st_rec.distinctive_from
            if not options.get("distinctive_to"): options["distinctive_to"] = st_rec.distinctive_to
            if not options.get("board_approval_date") and st_rec.board_approval_date: options["board_approval_date"] = st_rec.board_approval_date.isoformat()

    try:
        gen_result = generate_form_pdf(
            form_code=norm_code,
            work_id=str(work_id),
            snapshot=snapshot,
            options=options
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF generation error: {str(e)}")

    # Create GeneratedFormRecord
    record = GeneratedFormRecord(
        work_id=work_id,
        client_id=work.client_id,
        working_paper_id=wp.id if wp else None,
        form_code=norm_code,
        form_title=gen_result["form_title"],
        version=next_version,
        file_path=gen_result["file_path"],
        file_name=gen_result["file_name"],
        file_size=gen_result["file_size"],
        page_count=gen_result["page_count"],
        status="DRAFT",
        generated_by=current_user.email or current_user.name or "STAFF",
        missing_fields=gen_result["missing_fields"],
        form_parameters=_clean_json_dict(options)
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": str(record.id),
        "form_code": record.form_code,
        "form_title": record.form_title,
        "version": record.version,
        "file_name": record.file_name,
        "file_size": record.file_size,
        "page_count": record.page_count,
        "status": record.status,
        "missing_fields": record.missing_fields,
        "download_url": f"/api/forms-lab/download/{record.id}"
    }

@router.get("/history/{work_id}")
def get_work_generated_forms_history(
    work_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists version history of all generated forms for a work."""
    records = db.query(GeneratedFormRecord).filter(
        GeneratedFormRecord.work_id == work_id
    ).order_by(GeneratedFormRecord.created_at.desc()).all()

    return [
        {
            "id": str(r.id),
            "form_code": r.form_code,
            "form_title": r.form_title,
            "version": r.version,
            "file_name": r.file_name,
            "file_size": r.file_size,
            "page_count": r.page_count,
            "status": r.status,
            "generated_by": r.generated_by,
            "reviewed_by": r.reviewed_by,
            "review_notes": r.review_notes,
            "missing_fields": r.missing_fields,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "download_url": f"/api/forms-lab/download/{r.id}"
        }
        for r in records
    ]

@router.get("/download/{record_id}")
def download_generated_form(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Streams the generated PDF file for in-browser preview or download."""
    record = db.query(GeneratedFormRecord).filter(GeneratedFormRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Generated form record not found")

    if not os.path.exists(record.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")

    return FileResponse(
        path=record.file_path,
        media_type="application/pdf",
        filename=record.file_name
    )

@router.patch("/review/{record_id}")
def review_generated_form(
    record_id: uuid.UUID,
    payload: FormReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates status of generated form: DRAFT -> REVIEWED -> APPROVED_FOR_PORTAL_UPLOAD.
    Strictly forbids marking PORTAL_ACCEPTED without verified RJSC acknowledgement.
    """
    record = db.query(GeneratedFormRecord).filter(GeneratedFormRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Generated form record not found")

    allowed_statuses = ["DRAFT", "REVIEWED", "APPROVED_FOR_PORTAL_UPLOAD", "ARCHIVED"]
    if payload.new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Status {payload.new_status} is invalid. Portal acceptance cannot be marked without portal acknowledgement proof."
        )

    # Permission check for APPROVED_FOR_PORTAL_UPLOAD
    if payload.new_status == "APPROVED_FOR_PORTAL_UPLOAD" and current_user.role not in [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.SENIOR]:
        raise HTTPException(
            status_code=403,
            detail="Only Senior staff, Managers or Admins can approve forms for portal upload."
        )

    if payload.new_status == "APPROVED_FOR_PORTAL_UPLOAD" and record.missing_fields:
        raise HTTPException(status_code=400, detail="Cannot approve form with unresolved missing required fields: " + ", ".join(str(x) for x in record.missing_fields))

    record.status = payload.new_status
    record.reviewed_by = current_user.email or current_user.name or "REVIEWER"
    if payload.review_notes:
        record.review_notes = payload.review_notes

    db.commit()
    db.refresh(record)

    return {
        "id": str(record.id),
        "form_code": record.form_code,
        "version": record.version,
        "status": record.status,
        "reviewed_by": record.reviewed_by,
        "review_notes": record.review_notes
    }
