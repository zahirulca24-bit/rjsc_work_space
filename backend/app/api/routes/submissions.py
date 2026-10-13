from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc, func, and_
from typing import List, Optional, Any, Dict
import uuid
from uuid import UUID
from datetime import datetime, date, timezone

from app.db.session import get_db
from app.models.work import Work, WorkChecklist
from app.models.submission import WorkSubmissionRecord, WorkQueryRecord, WorkDeliveryRecord
from app.models.corporate_history import RjscFilingHistory
from app.models.workflow import Task
from app.models.document import Document
from app.models.generated_form import GeneratedFormRecord
from app.models.audit import AuditLog
from app.models.user import User
from app.models.client import Client, utc_now
from app.api.deps import get_current_user
from app.schemas.submission import (
    PreSubmissionReviewResponse,
    WorkSubmissionCreate,
    WorkResubmissionCreate,
    WorkQueryCreate,
    WorkQueryUpdate,
    WorkDeliveryCreate,
    WorkSubmissionRead,
    WorkQueryRead,
    WorkDeliveryRead,
    SubmissionLifecycleHistoryResponse,
)

router = APIRouter()


@router.get("/work/{work_id}/pre-submission-review", response_model=PreSubmissionReviewResponse)
def get_pre_submission_review(
    work_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    # Fetch generated forms
    stmt_forms = (
        select(GeneratedFormRecord)
        .where(GeneratedFormRecord.work_id == work_id)
        .order_by(GeneratedFormRecord.form_code, desc(GeneratedFormRecord.version))
    )
    all_gen_forms = db.execute(stmt_forms).scalars().all()

    # Deduplicate by form_code to get latest versions
    latest_forms_map: Dict[str, GeneratedFormRecord] = {}
    for form in all_gen_forms:
        if form.form_code not in latest_forms_map:
            latest_forms_map[form.form_code] = form

    latest_forms_list = [
        {
            "id": str(f.id),
            "form_code": f.form_code,
            "form_title": f.form_title,
            "version": f.version,
            "file_name": f.file_name,
            "file_path": f.file_path,
            "status": f.status,
            "missing_fields": f.missing_fields,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in latest_forms_map.values()
    ]

    approved_forms = [
        f for f in latest_forms_list
        if f["status"] == "APPROVED_FOR_PORTAL_UPLOAD"
    ]

    # Fetch checklist items
    stmt_chk = (
        select(WorkChecklist)
        .where(WorkChecklist.work_id == work_id)
        .order_by(WorkChecklist.sort_order.asc())
    )
    checklist_items = db.execute(stmt_chk).scalars().all()

    total_chk = len(checklist_items)
    completed_chk = len([
        c for c in checklist_items
        if c.status in ["COMPLETED", "VERIFIED", "RECEIVED"]
    ])

    missing_docs = [
        {
            "item_code": c.item_code,
            "item_text": c.item_text,
            "status": c.status,
            "source_reference": c.source_reference
        }
        for c in checklist_items
        if c.status not in ["COMPLETED", "VERIFIED", "RECEIVED"]
    ]

    warnings = []
    is_approved_for_submission = (work.review_status == "APPROVED")
    if not is_approved_for_submission:
        warnings.append(f"Work review status is '{work.review_status}'. Management approval ('APPROVED') is required before submission.")

    if not latest_forms_list:
        warnings.append("No RJSC statutory forms have been generated yet in Forms Lab.")
    elif not approved_forms:
        warnings.append("Generated forms are still in Draft/Review status. Mark forms as 'APPROVED_FOR_PORTAL_UPLOAD' in Forms Lab before filing.")

    if missing_docs:
        warnings.append(f"{len(missing_docs)} required document checklist item(s) are not verified or received.")

    # A work is submission-ready if:
    # 1. Management review is approved (or Ready for Submission)
    # 2. At least one approved form is present
    # 3. No missing blocking checklist items
    is_submission_ready = (
        is_approved_for_submission
        and len(approved_forms) > 0
        and len(missing_docs) == 0
    )

    return PreSubmissionReviewResponse(
        work_id=work.id,
        client_id=work.client_id,
        service_id=work.service_id,
        work_status=work.status,
        review_status=work.review_status or "DRAFT",
        filing_year=work.period_or_year,
        is_approved_for_submission=is_approved_for_submission,
        approved_forms=approved_forms,
        latest_generated_forms=latest_forms_list,
        required_checklist_items=[
            {
                "id": str(c.id),
                "item_code": c.item_code,
                "item_text": c.item_text,
                "status": c.status,
                "source_reference": c.source_reference
            }
            for c in checklist_items
        ],
        completed_checklist_count=completed_chk,
        total_checklist_count=total_chk,
        missing_documents=missing_docs,
        is_submission_ready=is_submission_ready,
        readiness_warnings=warnings,
    )


@router.post("/work/{work_id}", response_model=WorkSubmissionRead, status_code=status.HTTP_201_CREATED)
def record_manual_submission(
    work_id: UUID,
    payload: WorkSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    tracking_no = (payload.rjsc_tracking_no or "").strip()
    if not tracking_no:
        raise HTTPException(status_code=422, detail="RJSC filing or tracking number is required to record manual submission.")

    submitted_by = (payload.submitted_by or "").strip()
    if not submitted_by:
        submitted_by = current_user.name or current_user.email

    # Count existing submissions for this work
    sub_count = db.query(WorkSubmissionRecord).filter(WorkSubmissionRecord.work_id == work_id).count()

    # Determine forms submitted snapshot if empty
    forms_submitted = payload.forms_submitted
    if not forms_submitted:
        # Pull approved/latest forms
        stmt_forms = (
            select(GeneratedFormRecord)
            .where(GeneratedFormRecord.work_id == work_id)
            .order_by(GeneratedFormRecord.form_code, desc(GeneratedFormRecord.version))
        )
        all_gen = db.execute(stmt_forms).scalars().all()
        seen = set()
        for f in all_gen:
            if f.form_code not in seen:
                seen.add(f.form_code)
                forms_submitted.append({
                    "form_code": f.form_code,
                    "form_title": f.form_title,
                    "version": f.version,
                    "file_name": f.file_name,
                    "file_path": f.file_path,
                })

    sub_record = WorkSubmissionRecord(
        id=uuid.uuid4(),
        work_id=work.id,
        client_id=work.client_id,
        submission_type="INITIAL",
        submission_number=sub_count + 1,
        filing_year=payload.filing_year or work.period_or_year,
        forms_submitted=forms_submitted,
        submitted_at=payload.submitted_at,
        submitted_by=submitted_by,
        submitted_by_user_id=current_user.id,
        rjsc_tracking_no=tracking_no,
        portal_ack_ref=payload.portal_ack_ref,
        govt_fee_challan_ref=payload.govt_fee_challan_ref,
        ack_document_id=payload.ack_document_id,
        ack_document_name=payload.ack_document_name,
        notes=payload.notes,
        status="SUBMITTED"
    )
    db.add(sub_record)
    db.flush()

    # Advance work status to Submitted
    old_work_status = work.status
    work.status = "Submitted"
    work.submitted_at = payload.submitted_at

    # Audit log
    audit = AuditLog(
        entity_type="work_submission",
        entity_id=sub_record.id,
        action="MANUAL_SUBMISSION_RECORDED",
        performed_by=current_user.email,
        old_values={"work_status": old_work_status},
        new_values={
            "work_status": "Submitted",
            "rjsc_tracking_no": tracking_no,
            "submission_number": sub_count + 1,
            "forms_count": len(forms_submitted)
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(sub_record)
    return sub_record


@router.get("/work/{work_id}/history", response_model=SubmissionLifecycleHistoryResponse)
def get_submission_lifecycle_history(
    work_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    stmt_subs = (
        select(WorkSubmissionRecord)
        .where(WorkSubmissionRecord.work_id == work_id)
        .order_by(WorkSubmissionRecord.submission_number.asc(), WorkSubmissionRecord.submitted_at.asc())
    )
    submissions = db.execute(stmt_subs).scalars().all()

    stmt_queries = (
        select(WorkQueryRecord)
        .where(WorkQueryRecord.work_id == work_id)
        .order_by(WorkQueryRecord.query_date.desc(), WorkQueryRecord.created_at.desc())
    )
    all_queries = db.execute(stmt_queries).scalars().all()

    active_queries = [q for q in all_queries if q.status in ["OPEN", "IN_PROGRESS"]]
    resolved_queries = [q for q in all_queries if q.status in ["RESOLVED", "WAIVED"]]

    delivery = db.query(WorkDeliveryRecord).filter(WorkDeliveryRecord.work_id == work_id).first()

    return SubmissionLifecycleHistoryResponse(
        work_id=work.id,
        client_id=work.client_id,
        work_status=work.status,
        review_status=work.review_status or "DRAFT",
        submissions=submissions,
        active_queries=active_queries,
        resolved_queries=resolved_queries,
        delivery=delivery
    )


@router.post("/{submission_id}/query", response_model=WorkQueryRead, status_code=status.HTTP_201_CREATED)
def record_rjsc_query(
    submission_id: UUID,
    payload: WorkQueryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    sub = db.get(WorkSubmissionRecord, submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission record not found")

    work = db.get(Work, sub.work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Associated work not found")

    query_record = WorkQueryRecord(
        id=uuid.uuid4(),
        submission_id=sub.id,
        work_id=work.id,
        client_id=work.client_id,
        query_date=payload.query_date,
        query_reference=payload.query_reference,
        query_subject=payload.query_subject,
        query_description=payload.query_description,
        query_document_id=payload.query_document_id,
        query_document_name=payload.query_document_name,
        assigned_to=payload.assigned_to or work.assigned_to,
        deadline_date=payload.deadline_date,
        status="OPEN"
    )
    db.add(query_record)
    db.flush()

    # Update submission status
    sub.status = "QUERY_RAISED"

    # Update work status to Query/Follow-up
    old_work_status = work.status
    work.status = "Query/Follow-up"

    # Create correction task if requested
    if payload.create_correction_task:
        task = Task(
            work_id=work.id,
            title=f"RJSC Objection: {payload.query_subject}",
            description=f"Query Date: {payload.query_date}\nRef: {payload.query_reference or 'N/A'}\n\n{payload.query_description}",
            assigned_to=payload.assigned_to or work.assigned_to,
            priority="HIGH",
            due_date=payload.deadline_date,
            status="OPEN"
        )
        db.add(task)
        db.flush()
        query_record.linked_task_id = task.id

    audit = AuditLog(
        entity_type="work_query",
        entity_id=query_record.id,
        action="RJSC_QUERY_RECORDED",
        performed_by=current_user.email,
        old_values={"work_status": old_work_status, "submission_status": "SUBMITTED"},
        new_values={
            "work_status": "Query/Follow-up",
            "submission_status": "QUERY_RAISED",
            "query_subject": payload.query_subject,
            "deadline_date": str(payload.deadline_date) if payload.deadline_date else None
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(query_record)
    return query_record


@router.patch("/queries/{query_id}", response_model=WorkQueryRead)
def update_rjsc_query(
    query_id: UUID,
    payload: WorkQueryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.get(WorkQueryRecord, query_id)
    if not q:
        raise HTTPException(status_code=404, detail="Query record not found")

    if payload.status is not None:
        old_q_status = q.status
        q.status = payload.status
        if payload.status in ["RESOLVED", "WAIVED"] and not q.resolved_at:
            q.resolved_at = utc_now()
            q.resolved_by = current_user.name or current_user.email

            # Also resolve linked task if present
            if q.linked_task_id:
                task = db.get(Task, q.linked_task_id)
                if task and task.status != "COMPLETED":
                    task.status = "COMPLETED"
                    task.completed_at = utc_now()

    if payload.resolution_notes is not None:
        q.resolution_notes = payload.resolution_notes
    if payload.assigned_to is not None:
        q.assigned_to = payload.assigned_to
    if payload.deadline_date is not None:
        q.deadline_date = payload.deadline_date

    db.commit()
    db.refresh(q)
    return q


@router.post("/work/{work_id}/resubmit", response_model=WorkSubmissionRead, status_code=status.HTTP_201_CREATED)
def record_resubmission(
    work_id: UUID,
    payload: WorkResubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    parent_sub = db.get(WorkSubmissionRecord, payload.parent_submission_id)
    if not parent_sub or parent_sub.work_id != work.id:
        raise HTTPException(status_code=404, detail="Parent submission record not found for this work")

    tracking_no = (payload.rjsc_tracking_no or "").strip()
    if not tracking_no:
        raise HTTPException(status_code=422, detail="Resubmission tracking number is required.")

    # Count total submissions
    sub_count = db.query(WorkSubmissionRecord).filter(WorkSubmissionRecord.work_id == work_id).count()

    forms_submitted = payload.forms_submitted
    if not forms_submitted:
        # Default to parent submission forms if not specified
        forms_submitted = parent_sub.forms_submitted

    resub_record = WorkSubmissionRecord(
        id=uuid.uuid4(),
        work_id=work.id,
        client_id=work.client_id,
        submission_type="RESUBMISSION",
        submission_number=sub_count + 1,
        parent_submission_id=parent_sub.id,
        filing_year=payload.filing_year or parent_sub.filing_year,
        forms_submitted=forms_submitted,
        submitted_at=payload.submitted_at,
        submitted_by=payload.submitted_by or current_user.email,
        submitted_by_user_id=current_user.id,
        rjsc_tracking_no=tracking_no,
        portal_ack_ref=payload.portal_ack_ref,
        govt_fee_challan_ref=payload.govt_fee_challan_ref,
        ack_document_id=payload.ack_document_id,
        ack_document_name=payload.ack_document_name,
        notes=payload.notes,
        status="SUBMITTED"
    )
    db.add(resub_record)
    db.flush()

    # If resolving a specific query
    if payload.resolves_query_id:
        q = db.get(WorkQueryRecord, payload.resolves_query_id)
        if q and q.work_id == work.id:
            q.status = "RESOLVED"
            q.resolved_at = utc_now()
            q.resolved_by = current_user.name or current_user.email
            q.resolution_notes = payload.resolution_notes or f"Resolved by resubmission {resub_record.submission_number} (Ref: {tracking_no})"
            if q.linked_task_id:
                task = db.get(Task, q.linked_task_id)
                if task:
                    task.status = "COMPLETED"
                    task.completed_at = utc_now()

    # Advance work status back to Submitted
    old_work_status = work.status
    work.status = "Submitted"
    work.submitted_at = payload.submitted_at

    audit = AuditLog(
        entity_type="work_submission",
        entity_id=resub_record.id,
        action="RESUBMISSION_RECORDED",
        performed_by=current_user.email,
        old_values={"work_status": old_work_status, "parent_submission_id": str(parent_sub.id)},
        new_values={
            "work_status": "Submitted",
            "submission_type": "RESUBMISSION",
            "submission_number": sub_count + 1,
            "rjsc_tracking_no": tracking_no
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(resub_record)
    return resub_record


@router.post("/work/{work_id}/delivery", response_model=WorkDeliveryRead)
def record_final_decision_and_delivery(
    work_id: UUID,
    payload: WorkDeliveryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    work = db.get(Work, work_id)
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    client = db.get(Client, work.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    existing_delivery = db.query(WorkDeliveryRecord).filter(WorkDeliveryRecord.work_id == work.id).first()

    now = utc_now()
    filing_id = None

    # If approved or certified copy issued, update/create Corporate History filing record
    if payload.outcome in ["APPROVED", "CERTIFIED_COPY_ISSUED"]:
        # Editing a delivery must not duplicate the same statutory filing.
        filing_record = None
        if existing_delivery and existing_delivery.corporate_history_filing_id:
            filing_record = db.get(RjscFilingHistory, existing_delivery.corporate_history_filing_id)
        if filing_record is None:
            filing_record = RjscFilingHistory(client_id=client.id)
            db.add(filing_record)
        filing_record.service_type = work.service_id
        filing_record.form_name = f"Filing for Work {work.work_code}"
        filing_record.effective_date = payload.outcome_date
        filing_record.submission_date = work.submitted_at.date() if work.submitted_at else payload.outcome_date
        filing_record.approval_date = payload.outcome_date
        filing_record.status = "APPROVED"
        filing_record.reference = payload.rjsc_approval_ref or f"Approval for {work.work_code}"
        filing_record.notes = f"Delivery via {payload.delivery_method or 'N/A'}. Client Ack Ref: {payload.client_ack_ref or 'Pending'}. {payload.notes or ''}".strip()
        db.flush()
        filing_id = filing_record.id

    if existing_delivery:
        delivery = existing_delivery
        delivery.outcome = payload.outcome
        delivery.outcome_date = payload.outcome_date
        delivery.rjsc_approval_ref = payload.rjsc_approval_ref
        delivery.certified_copy_document_id = payload.certified_copy_document_id
        delivery.certified_copy_document_name = payload.certified_copy_document_name
        delivery.delivered_to_client_at = payload.delivered_to_client_at
        delivery.delivered_by = payload.delivered_by or current_user.name or current_user.email
        delivery.delivery_method = payload.delivery_method
        delivery.client_ack_ref = payload.client_ack_ref
        delivery.client_ack_document_id = payload.client_ack_document_id
        delivery.client_ack_document_name = payload.client_ack_document_name
        delivery.notes = payload.notes
        if filing_id:
            delivery.corporate_history_filing_id = filing_id
    else:
        delivery = WorkDeliveryRecord(
            id=uuid.uuid4(),
            work_id=work.id,
            client_id=client.id,
            outcome=payload.outcome,
            outcome_date=payload.outcome_date,
            rjsc_approval_ref=payload.rjsc_approval_ref,
            certified_copy_document_id=payload.certified_copy_document_id,
            certified_copy_document_name=payload.certified_copy_document_name,
            delivered_to_client_at=payload.delivered_to_client_at,
            delivered_by=payload.delivered_by or current_user.name or current_user.email,
            delivery_method=payload.delivery_method,
            client_ack_ref=payload.client_ack_ref,
            client_ack_document_id=payload.client_ack_document_id,
            client_ack_document_name=payload.client_ack_document_name,
            notes=payload.notes,
            corporate_history_filing_id=filing_id
        )
        db.add(delivery)
    db.flush()

    old_work_status = work.status

    # If delivered to client, update status
    if payload.delivered_to_client_at:
        work.status = "Delivered"

    # Operational closure is separate from financial settlement
    if payload.close_work_operationally:
        work.status = "Closed"
        work.completed_at = now
        delivery.operational_closed_at = now
        delivery.closed_by = current_user.email

    audit = AuditLog(
        entity_type="work_delivery",
        entity_id=delivery.id,
        action="FINAL_DECISION_AND_DELIVERY_RECORDED",
        performed_by=current_user.email,
        old_values={"work_status": old_work_status},
        new_values={
            "outcome": payload.outcome,
            "work_status": work.status,
            "operationally_closed": payload.close_work_operationally,
            "corporate_history_filing_id": str(filing_id) if filing_id else None
        }
    )
    db.add(audit)

    db.commit()
    db.refresh(delivery)
    return delivery


@router.get("/dashboard")
def get_submission_desk_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ready for submission: Review status APPROVED or Work status Ready for Submission
    stmt_ready = (
        select(Work)
        .where(Work.status.in_(["Ready for Submission"]))
        .order_by(desc(Work.updated_at))
    )
    ready_works = db.execute(stmt_ready).scalars().all()

    # Active Submitted: Status Submitted
    stmt_submitted = (
        select(Work)
        .where(Work.status == "Submitted")
        .order_by(desc(Work.submitted_at))
    )
    submitted_works = db.execute(stmt_submitted).scalars().all()

    # Active Queries: Status OPEN or IN_PROGRESS
    stmt_queries = (
        select(WorkQueryRecord)
        .where(WorkQueryRecord.status.in_(["OPEN", "IN_PROGRESS"]))
        .order_by(WorkQueryRecord.deadline_date.asc().nulls_last())
    )
    active_queries = db.execute(stmt_queries).scalars().all()

    # Delivered / Awaiting Closure: Status Delivered
    stmt_delivered = (
        select(Work)
        .where(Work.status == "Delivered")
        .order_by(desc(Work.updated_at))
    )
    delivered_works = db.execute(stmt_delivered).scalars().all()

    return {
        "ready_for_submission_count": len(ready_works),
        "submitted_count": len(submitted_works),
        "open_queries_count": len(active_queries),
        "delivered_count": len(delivered_works),
        "active_queries": [
            {
                "id": str(q.id),
                "work_id": str(q.work_id),
                "query_subject": q.query_subject,
                "query_date": str(q.query_date),
                "deadline_date": str(q.deadline_date) if q.deadline_date else None,
                "assigned_to": q.assigned_to,
                "status": q.status,
            }
            for q in active_queries
        ],
    }
