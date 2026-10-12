import uuid
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from ...db.session import get_db
from ..deps import get_current_user
from ...models.user import User, RoleEnum
from ...models.client import Client
from ...models.work import Work, WorkChecklist
from ...models.corporate_history import ShareTransferHistory, Shareholder
from ...models.audit import AuditLog

router = APIRouter(prefix="/share-transfers", tags=["Share Transfer Service"])

class ShareTransferProposalRequest(BaseModel):
    transferor_name: str
    transferor_address: Optional[str] = None
    transferee_name: str
    transferee_address: Optional[str] = None
    share_class: Optional[str] = "Ordinary Shares"
    share_count: float
    nominal_value: Optional[float] = 100.0
    paid_up_per_share: Optional[float] = 100.0
    consideration_amount: float
    distinctive_from: Optional[int] = None
    distinctive_to: Optional[int] = None
    execution_date: Optional[date] = None
    board_approval_date: Optional[date] = None
    transfer_no: Optional[str] = "1"
    source_evidence: Optional[str] = None
    notes: Optional[str] = None

@router.get("/work/{work_id}")
def get_work_share_transfer(
    work_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves the active Share Transfer proposal and current shareholder registry
    for pre/post reconciliation and Form 117 drafting.
    """
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Current Master Shareholders
    current_shareholders = db.query(Shareholder).filter(
        Shareholder.client_id == client.id,
        Shareholder.is_current == True
    ).order_by(desc(Shareholder.share_count)).all()

    shareholder_options = [
        {
            "id": str(s.id),
            "shareholder_name": s.shareholder_name,
            "share_count": float(s.share_count),
            "share_value": float(s.share_value),
            "ownership_percentage": float(s.ownership_percentage) if s.ownership_percentage is not None else None
        }
        for s in current_shareholders
    ]

    total_shares = sum(s["share_count"] for s in shareholder_options)

    # Active transfer proposal for this work
    transfer_rec = db.query(ShareTransferHistory).filter(
        ShareTransferHistory.work_id == work_id
    ).order_by(desc(ShareTransferHistory.created_at)).first()

    return {
        "work_id": str(work.id),
        "work_code": work.work_code,
        "client_id": str(client.id),
        "client_name": client.legal_name,
        "total_company_shares": total_shares,
        "current_shareholders": shareholder_options,
        "active_transfer": {
            "id": str(transfer_rec.id),
            "transfer_no": transfer_rec.transfer_no,
            "transferor_name": transfer_rec.transferor_name,
            "transferor_address": transfer_rec.transferor_address,
            "transferee_name": transfer_rec.transferee_name,
            "transferee_address": transfer_rec.transferee_address,
            "share_class": transfer_rec.share_class,
            "share_count": float(transfer_rec.share_count),
            "nominal_value": float(transfer_rec.nominal_value),
            "paid_up_per_share": float(transfer_rec.paid_up_per_share),
            "consideration_amount": float(transfer_rec.consideration_amount),
            "distinctive_from": transfer_rec.distinctive_from,
            "distinctive_to": transfer_rec.distinctive_to,
            "execution_date": transfer_rec.execution_date.isoformat() if transfer_rec.execution_date else None,
            "board_approval_date": transfer_rec.board_approval_date.isoformat() if transfer_rec.board_approval_date else None,
            "status": transfer_rec.status,
            "pre_transfer_state": transfer_rec.pre_transfer_state,
            "post_transfer_state": transfer_rec.post_transfer_state,
            "source_evidence": transfer_rec.source_evidence,
            "notes": transfer_rec.notes
        } if transfer_rec else None
    }

@router.post("/work/{work_id}")
def save_share_transfer_proposal(
    work_id: uuid.UUID,
    payload: ShareTransferProposalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validates shareholding balance and saves draft Share Transfer record.
    Performs pre/post shareholding balance reconciliation:
    - Confirms transferor holds at least the proposed number of shares.
    - Ensures total company share capital remains unchanged and balanced.
    - Does NOT mutate the Client Master register until explicit authorization.
    """
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if payload.share_count <= 0:
        raise HTTPException(status_code=400, detail="Share count must be greater than zero")

    # Fetch current shareholders
    current_shareholders = db.query(Shareholder).filter(
        Shareholder.client_id == client.id,
        Shareholder.is_current == True
    ).all()

    total_shares_before = sum(float(s.share_count) for s in current_shareholders)

    # Validate Transferor
    transferor = next(
        (s for s in current_shareholders if s.shareholder_name.strip().lower() == payload.transferor_name.strip().lower()),
        None
    )

    if not transferor:
        raise HTTPException(
            status_code=400,
            detail=f"Transferor '{payload.transferor_name}' is not found among current active shareholders"
        )

    if float(transferor.share_count) < payload.share_count:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Transferor '{payload.transferor_name}' currently holds {float(transferor.share_count):,.0f} shares, "
                f"which is insufficient for the requested transfer of {payload.share_count:,.0f} shares."
            )
        )

    # Compute Pre-transfer State
    pre_state = [
        {
            "shareholder_name": s.shareholder_name,
            "share_count": float(s.share_count),
            "ownership_percentage": round((float(s.share_count) / total_shares_before * 100), 2) if total_shares_before > 0 else 0.0
        }
        for s in current_shareholders
    ]

    # Compute Post-transfer State
    post_map: Dict[str, float] = {}
    for s in current_shareholders:
        post_map[s.shareholder_name] = float(s.share_count)

    post_map[transferor.shareholder_name] -= payload.share_count

    transferee_key = payload.transferee_name.strip()
    # Match case-insensitively with existing
    existing_transferee = next((k for k in post_map.keys() if k.lower() == transferee_key.lower()), None)
    if existing_transferee:
        post_map[existing_transferee] += payload.share_count
    else:
        post_map[transferee_key] = payload.share_count

    total_shares_after = sum(post_map.values())
    if abs(total_shares_after - total_shares_before) > 0.001:
        raise HTTPException(
            status_code=400,
            detail=f"Balance reconciliation error: Total shares before ({total_shares_before}) != Total shares after ({total_shares_after})"
        )

    post_state = [
        {
            "shareholder_name": name,
            "share_count": count,
            "ownership_percentage": round((count / total_shares_after * 100), 2) if total_shares_after > 0 else 0.0
        }
        for name, count in post_map.items()
        if count > 0
    ]

    # Find or create ShareTransferHistory record
    transfer_rec = db.query(ShareTransferHistory).filter(
        ShareTransferHistory.work_id == work_id
    ).first()

    if not transfer_rec:
        transfer_rec = ShareTransferHistory(
            client_id=client.id,
            work_id=work.id,
            status="DRAFT"
        )
        db.add(transfer_rec)

    transfer_rec.transfer_no = payload.transfer_no or "1"
    transfer_rec.transferor_name = payload.transferor_name
    transfer_rec.transferor_address = payload.transferor_address or client.registered_office_text
    transfer_rec.transferee_name = payload.transferee_name
    transfer_rec.transferee_address = payload.transferee_address or client.registered_office_text
    transfer_rec.share_class = payload.share_class or "Ordinary Shares"
    transfer_rec.share_count = payload.share_count
    transfer_rec.nominal_value = payload.nominal_value or 100.0
    transfer_rec.paid_up_per_share = payload.paid_up_per_share or 100.0
    transfer_rec.consideration_amount = payload.consideration_amount
    transfer_rec.distinctive_from = payload.distinctive_from
    transfer_rec.distinctive_to = payload.distinctive_to
    transfer_rec.execution_date = payload.execution_date
    transfer_rec.board_approval_date = payload.board_approval_date
    transfer_rec.pre_transfer_state = pre_state
    transfer_rec.post_transfer_state = post_state
    transfer_rec.source_evidence = payload.source_evidence
    transfer_rec.notes = payload.notes

    # Ensure statutory checklist items exist on Work
    existing_chk = db.query(WorkChecklist).filter(WorkChecklist.work_id == work_id).all()
    if not existing_chk:
        st_items = [
            ("Execution of Form 117 on non-judicial stamp by Transferor & Transferee", "Companies Act 1994, Sec 38"),
            ("Surrender and cancellation/endorsement of original share certificate(s)", "Articles of Association"),
            ("Board of Directors meeting passing formal transfer resolution", "Articles of Association"),
            ("Entry in Register of Members (Sec 34)", "Companies Act 1994, Sec 34"),
            ("RJSC Portal manual submission and upload of Form 117", "RJSC Filing Procedure")
        ]
        for idx, (txt, src) in enumerate(st_items):
            chk = WorkChecklist(
                work_id=work.id,
                item_code=f"ST-CHK-{idx+1:02d}",
                item_text=txt,
                status="PENDING",
                source_reference=src,
                sort_order=idx + 1
            )
            db.add(chk)

    db.commit()
    db.refresh(transfer_rec)

    return {
        "message": "Share transfer proposal reconciled and saved successfully",
        "transfer_id": str(transfer_rec.id),
        "status": transfer_rec.status,
        "total_shares_reconciled": total_shares_after,
        "pre_transfer_state": pre_state,
        "post_transfer_state": post_state
    }

@router.post("/work/{work_id}/apply")
def apply_share_transfer_to_master(
    work_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    AUTHORITY ACTION:
    Applies the approved share transfer directly to Client Master's shareholder register.
    - Mutates the `shareholders` table with strict reconciliation.
    - Marks `ShareTransferHistory.status = 'EXECUTED_IN_REGISTER'`.
    - Creates an immutable AuditLog entry with before/after state.
    """
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work order not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    transfer_rec = db.query(ShareTransferHistory).filter(
        ShareTransferHistory.work_id == work_id
    ).first()

    if not transfer_rec:
        raise HTTPException(status_code=404, detail="No active share transfer record found for this work")

    if transfer_rec.status == "EXECUTED_IN_REGISTER":
        raise HTTPException(status_code=400, detail="This share transfer has already been executed into the shareholder register")

    # Fetch current active shareholders
    current_shareholders = db.query(Shareholder).filter(
        Shareholder.client_id == client.id,
        Shareholder.is_current == True
    ).all()

    transferor = next(
        (s for s in current_shareholders if s.shareholder_name.strip().lower() == transfer_rec.transferor_name.strip().lower()),
        None
    )

    if not transferor or float(transferor.share_count) < float(transfer_rec.share_count):
        raise HTTPException(
            status_code=400,
            detail="Transfer cannot be executed: transferor no longer possesses required share count"
        )

    # 1. Deduct from Transferor
    transferor.share_count = float(transferor.share_count) - float(transfer_rec.share_count)
    if transferor.share_count <= 0:
        transferor.is_current = False
        transferor.effective_to = transfer_rec.execution_date or date.today()

    # 2. Add to Transferee
    transferee = next(
        (s for s in current_shareholders if s.shareholder_name.strip().lower() == transfer_rec.transferee_name.strip().lower()),
        None
    )

    if transferee:
        transferee.share_count = float(transferee.share_count) + float(transfer_rec.share_count)
    else:
        transferee = Shareholder(
            client_id=client.id,
            shareholder_name=transfer_rec.transferee_name,
            share_count=float(transfer_rec.share_count),
            share_value=float(transfer_rec.nominal_value),
            effective_from=transfer_rec.execution_date or date.today(),
            is_current=True,
            source_document="Form 117 Share Transfer"
        )
        db.add(transferee)

    db.flush()

    # 3. Recalculate Ownership Percentages
    active_now = db.query(Shareholder).filter(
        Shareholder.client_id == client.id,
        Shareholder.is_current == True
    ).all()

    total_shares_now = sum(float(s.share_count) for s in active_now)
    for s in active_now:
        if total_shares_now > 0:
            s.ownership_percentage = round((float(s.share_count) / total_shares_now * 100), 2)

    # 4. Mark Transfer Status Executed
    transfer_rec.status = "EXECUTED_IN_REGISTER"

    # 5. Immutable Audit Log Entry
    audit_entry = AuditLog(
        entity_type="share_transfers",
        entity_id=transfer_rec.id,
        action="SHARE_TRANSFER_EXECUTED_IN_REGISTER",
        performed_by=current_user.email or current_user.name or "STAFF",
        old_values={"pre_state": transfer_rec.pre_transfer_state},
        new_values={
            "post_state": transfer_rec.post_transfer_state,
            "transferor": transfer_rec.transferor_name,
            "transferee": transfer_rec.transferee_name,
            "share_count": float(transfer_rec.share_count),
            "consideration": float(transfer_rec.consideration_amount)
        }
    )
    db.add(audit_entry)

    db.commit()

    return {
        "message": "Share transfer successfully applied to Client Master Shareholder Register",
        "status": "EXECUTED_IN_REGISTER",
        "active_shareholders": [
            {
                "name": s.shareholder_name,
                "share_count": float(s.share_count),
                "ownership_percentage": float(s.ownership_percentage) if s.ownership_percentage is not None else None
            }
            for s in active_now
        ]
    }
