import uuid
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ...db.session import get_db
from ..deps import get_current_user
from ...models.user import User, RoleEnum
from ...models.client import Client
from ...models.work import Work, WorkChecklist
from ...models.corporate_history import MortgageChargeHistory
from ...models.audit import AuditLog

router = APIRouter(prefix="/mortgage-charges", tags=["Mortgage & Charge Service"])

class MortgageChargeProposalRequest(BaseModel):
    charge_type: Optional[str] = "CREATION"  # CREATION, MODIFICATION, SATISFACTION
    lender: str
    secured_amount: float
    instrument_type: Optional[str] = "Deed of Mortgage / Hypothecation"
    instrument_date: Optional[date] = None
    registration_date: Optional[date] = None
    filing_reference: Optional[str] = None
    property_description: Optional[str] = None
    modification_details: Optional[str] = None
    satisfaction_date: Optional[date] = None
    satisfaction_noc_ref: Optional[str] = None
    statutory_form_code: Optional[str] = "FORM_XVIII"
    notes: Optional[str] = None

@router.get("/work/{work_id}")
def get_work_mortgage_charge(
    work_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the active Mortgage/Charge record for the work order,
    evaluating Section 159 / 160 statutory 21-calendar-day deadline
    and High Court condonation flags (Sec 171).
    """
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    charge_rec = db.query(MortgageChargeHistory).filter(
        MortgageChargeHistory.work_id == work_id
    ).order_by(desc(MortgageChargeHistory.created_at)).first()

    today = date.today()
    statutory_deadline = None
    days_remaining = None
    high_court_condonation_required = False
    statutory_message = ""

    if charge_rec and charge_rec.instrument_date and charge_rec.charge_type in ["CREATION", "MODIFICATION"]:
        statutory_deadline = charge_rec.instrument_date + timedelta(days=21)
        if not charge_rec.registration_date:
            if today > statutory_deadline:
                high_court_condonation_required = True
                statutory_message = (
                    f"CRITICAL: Instrument date is {charge_rec.instrument_date.isoformat()}. "
                    f"The 21-calendar-day statutory deadline expired on {statutory_deadline.isoformat()} "
                    f"({(today - statutory_deadline).days} days overdue). "
                    "Under Section 171 of The Companies Act, 1994, registration cannot proceed "
                    "without an order from the High Court Division condoning the delay."
                )
            else:
                days_remaining = (statutory_deadline - today).days
                statutory_message = (
                    f"Statutory filing deadline: {statutory_deadline.isoformat()} "
                    f"({days_remaining} calendar days remaining under Section 159)."
                )

    # All client existing charges
    all_client_charges = db.query(MortgageChargeHistory).filter(
        MortgageChargeHistory.client_id == client.id
    ).order_by(desc(MortgageChargeHistory.created_at)).all()

    return {
        "work_id": str(work.id),
        "work_code": work.work_code,
        "client_id": str(client.id),
        "client_name": client.legal_name,
        "active_charge": {
            "id": str(charge_rec.id),
            "charge_type": charge_rec.charge_type,
            "lender": charge_rec.lender,
            "secured_amount": float(charge_rec.secured_amount),
            "instrument_type": charge_rec.instrument_type,
            "instrument_date": charge_rec.instrument_date.isoformat() if charge_rec.instrument_date else None,
            "registration_date": charge_rec.registration_date.isoformat() if charge_rec.registration_date else None,
            "filing_reference": charge_rec.filing_reference,
            "property_description": charge_rec.property_description,
            "modification_details": charge_rec.modification_details,
            "satisfaction_date": charge_rec.satisfaction_date.isoformat() if charge_rec.satisfaction_date else None,
            "satisfaction_noc_ref": charge_rec.satisfaction_noc_ref,
            "statutory_form_code": charge_rec.statutory_form_code,
            "status": charge_rec.status,
            "notes": charge_rec.notes
        } if charge_rec else None,
        "statutory_compliance": {
            "statutory_deadline": statutory_deadline.isoformat() if statutory_deadline else None,
            "days_remaining": days_remaining,
            "high_court_condonation_required": high_court_condonation_required,
            "statutory_section": "Section 159 (Creation) / Section 160 (Modification) / Section 171 (High Court Condonation)",
            "message": statutory_message
        },
        "all_charges_history": [
            {
                "id": str(c.id),
                "charge_type": c.charge_type,
                "lender": c.lender,
                "secured_amount": float(c.secured_amount),
                "instrument_date": c.instrument_date.isoformat() if c.instrument_date else None,
                "registration_date": c.registration_date.isoformat() if c.registration_date else None,
                "status": c.status
            }
            for c in all_client_charges
        ]
    }

@router.post("/work/{work_id}")
def save_mortgage_charge_proposal(
    work_id: uuid.UUID,
    payload: MortgageChargeProposalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves or updates Mortgage/Charge particulars for the work order.
    Determines statutory form code (FORM_XVIII, FORM_XIX, FORM_XXVIII)
    and populates statutory checklist.
    """
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    charge_rec = db.query(MortgageChargeHistory).filter(
        MortgageChargeHistory.work_id == work_id
    ).first()

    if not charge_rec:
        charge_rec = MortgageChargeHistory(
            client_id=client.id,
            work_id=work.id,
            status="ACTIVE"
        )
        db.add(charge_rec)

    # Determine default form code based on charge type
    form_code = payload.statutory_form_code
    if not form_code:
        if payload.charge_type == "MODIFICATION":
            form_code = "FORM_XIX"
        elif payload.charge_type == "SATISFACTION":
            form_code = "FORM_XXVIII"
        else:
            form_code = "FORM_XVIII"

    charge_rec.charge_type = payload.charge_type or "CREATION"
    charge_rec.lender = payload.lender
    charge_rec.secured_amount = payload.secured_amount
    charge_rec.instrument_type = payload.instrument_type
    charge_rec.instrument_date = payload.instrument_date
    charge_rec.creation_date = payload.instrument_date
    charge_rec.registration_date = payload.registration_date
    charge_rec.filing_reference = payload.filing_reference
    charge_rec.property_description = payload.property_description
    charge_rec.modification_details = payload.modification_details
    charge_rec.satisfaction_date = payload.satisfaction_date
    charge_rec.satisfaction_noc_ref = payload.satisfaction_noc_ref
    charge_rec.statutory_form_code = form_code
    charge_rec.notes = payload.notes

    # Add appropriate checklist items if not already present
    existing_chk = db.query(WorkChecklist).filter(WorkChecklist.work_id == work_id).all()
    if not existing_chk:
        chk_items = []
        if payload.charge_type == "CREATION":
            chk_items = [
                ("Obtain certified copy of Mortgage Deed, Sanction Letter & Schedule of Property", "Sec 159 Companies Act 1994"),
                ("Draft Form XVIII (Particulars of Mortgages or Charges)", "Sec 159 Companies Act 1994"),
                ("Verify filing within 21 calendar days from instrument date", "Sec 159 Statutory Limit"),
                ("Director signature and execution with company seal", "Board of Directors Authority"),
                ("Manual RJSC Portal upload, fee payment, and RJSC charge certificate follow-up", "RJSC Filing Registry")
            ]
        elif payload.charge_type == "MODIFICATION":
            chk_items = [
                ("Obtain Supplementary Deed / Revised Sanction Letter", "Sec 160 Companies Act 1994"),
                ("Draft Form XIX (Particulars of Modification of Mortgage/Charge)", "Sec 160 Companies Act 1994"),
                ("Verify filing within 21 calendar days from modification instrument date", "Sec 160 Statutory Limit"),
                ("Manual RJSC Portal upload and registration verification", "RJSC Filing Registry")
            ]
        else:
            chk_items = [
                ("Obtain Bank No Objection Certificate (NOC) and full satisfaction confirmation", "Sec 169 Companies Act 1994"),
                ("Draft Form XXVIII (Memorandum of Complete Satisfaction of Charge)", "Sec 172 Companies Act 1994"),
                ("Issue statutory notice to lender / verify notice response", "Sec 169(2) Companies Act 1994"),
                ("Manual RJSC Portal submission & archival of Satisfaction Certificate", "RJSC Filing Registry")
            ]

        for idx, (txt, src) in enumerate(chk_items):
            chk = WorkChecklist(
                work_id=work.id,
                item_code=f"CHG-CHK-{idx+1:02d}",
                item_text=txt,
                status="PENDING",
                source_reference=src,
                sort_order=idx + 1
            )
            db.add(chk)

    db.commit()
    db.refresh(charge_rec)

    # Assess 21-day deadline
    condonation = False
    if charge_rec.instrument_date and charge_rec.charge_type in ["CREATION", "MODIFICATION"]:
        deadline = charge_rec.instrument_date + timedelta(days=21)
        if date.today() > deadline and not charge_rec.registration_date:
            condonation = True

    return {
        "message": "Mortgage/Charge proposal saved successfully",
        "charge_id": str(charge_rec.id),
        "charge_type": charge_rec.charge_type,
        "statutory_form_code": charge_rec.statutory_form_code,
        "high_court_condonation_required": condonation
    }

@router.post("/work/{work_id}/apply")
def apply_mortgage_charge_to_master(
    work_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AUTHORITY ACTION:
    Confirms and permanently commits the registered mortgage/charge status
    into Client Master's Register of Mortgages & Charges.
    - Strict role gate: only ADMIN or MANAGER roles authorized.
    - Strict evidence gate: requires actual RJSC registration date and source-backed filing evidence.
    - NEVER substitutes today's date for missing registration dates.
    - Logs immutable audit record.
    """
    user_role = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if user_role not in [RoleEnum.ADMIN.value, RoleEnum.MANAGER.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized staff: Only ADMIN or MANAGER roles can commit mortgage/charge records to Client Master."
        )

    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    charge_rec = db.query(MortgageChargeHistory).filter(
        MortgageChargeHistory.work_id == work_id
    ).first()

    if not charge_rec:
        raise HTTPException(status_code=404, detail="No active mortgage/charge record found for this work")

    # Strict Evidence Verification:
    # 1. Registration Date: Never substitute today's date
    if charge_rec.charge_type in ["CREATION", "MODIFICATION"]:
        if not charge_rec.registration_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply mortgage/charge to Client Master: Actual RJSC registration date is missing. Substitution of today's date is strictly prohibited under statutory audit standards."
            )
        if not charge_rec.filing_reference or not charge_rec.filing_reference.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply mortgage/charge to Client Master: Source-backed registration evidence (filing_reference / RJSC Certificate of Registration number) is required before marking charge as registered or modified."
            )
        charge_rec.status = "MODIFIED" if charge_rec.charge_type == "MODIFICATION" else "ACTIVE"

    elif charge_rec.charge_type == "SATISFACTION":
        sat_date = charge_rec.satisfaction_date or charge_rec.registration_date
        if not sat_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply mortgage/charge satisfaction to Client Master: Actual satisfaction date is missing."
            )
        if (not charge_rec.satisfaction_noc_ref or not charge_rec.satisfaction_noc_ref.strip()) and (not charge_rec.filing_reference or not charge_rec.filing_reference.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot apply mortgage/charge satisfaction to Client Master: Source-backed evidence (Bank NOC reference or RJSC satisfaction filing reference) is required before marking charge as satisfied."
            )
        charge_rec.status = "SATISFIED"

    audit_entry = AuditLog(
        entity_type="mortgage_charges",
        entity_id=charge_rec.id,
        action=f"MORTGAGE_CHARGE_{charge_rec.charge_type}_COMMITTED",
        performed_by=current_user.email or current_user.name or "STAFF",
        old_values=None,
        new_values={
            "work_id": str(work.id),
            "client_id": str(client.id),
            "lender": charge_rec.lender,
            "secured_amount": float(charge_rec.secured_amount),
            "instrument_date": charge_rec.instrument_date.isoformat() if charge_rec.instrument_date else None,
            "registration_date": charge_rec.registration_date.isoformat() if charge_rec.registration_date else None,
            "satisfaction_date": charge_rec.satisfaction_date.isoformat() if charge_rec.satisfaction_date else None,
            "filing_reference": charge_rec.filing_reference,
            "satisfaction_noc_ref": charge_rec.satisfaction_noc_ref,
            "status": charge_rec.status,
            "form_code": charge_rec.statutory_form_code
        }
    )
    db.add(audit_entry)
    db.commit()

    return {
        "message": f"Mortgage charge successfully committed to Client Master ({charge_rec.status})",
        "charge_id": str(charge_rec.id),
        "status": charge_rec.status,
        "registration_date": charge_rec.registration_date.isoformat() if charge_rec.registration_date else (charge_rec.satisfaction_date.isoformat() if charge_rec.satisfaction_date else None)
    }
