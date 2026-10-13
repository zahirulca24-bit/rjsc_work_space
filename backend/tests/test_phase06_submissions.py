import uuid
from datetime import date, datetime, timezone
import pytest

from app.main import app
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.client import Client
from app.models.work import Work, WorkChecklist
from app.models.corporate_history import RjscFilingHistory
from app.models.generated_form import GeneratedFormRecord
from app.models.submission import WorkSubmissionRecord, WorkQueryRecord, WorkDeliveryRecord
from app.models.workflow import Task

@pytest.fixture(autouse=True)
def clear_overrides():
    old = app.dependency_overrides.pop(get_current_user, None)
    yield
    if old:
        app.dependency_overrides[get_current_user] = old

def _auth(role=RoleEnum.ADMIN):
    user = User(
        id=uuid.uuid4(),
        name=f"{role.value} Staff",
        email=f"{role.value.lower()}@test.com",
        role=role.value,
        is_active=True
    )
    app.dependency_overrides[get_current_user] = lambda: user
    return user

@pytest.fixture
def test_client_and_work(client, db_session):
    _auth(RoleEnum.ADMIN)
    u_id = uuid.uuid4().hex[:6]

    # Create client
    c_res = client.post("/api/clients", json={
        "legal_name": f"ALPHA TEST {u_id} LTD",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": f"C-P6-{u_id}"
    })
    assert c_res.status_code == 200
    client_id = uuid.UUID(c_res.json()["id"])

    # Create work
    w_res = client.post("/api/works", json={
        "client_id": str(client_id),
        "service_id": "annual-filing",
        "entity_type": "PRIVATE_COMPANY",
        "period_or_year": "2024",
        "status": "In Preparation"
    })
    assert w_res.status_code == 200
    work_id = uuid.UUID(w_res.json()["id"])

    return client_id, work_id


def test_pre_submission_review_not_ready(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    res = client.get(f"/api/submissions/work/{work_id}/pre-submission-review")
    assert res.status_code == 200
    data = res.json()

    assert data["work_id"] == str(work_id)
    assert data["is_approved_for_submission"] is False
    assert data["is_submission_ready"] is False
    assert len(data["readiness_warnings"]) > 0
    assert any("approval" in w.lower() for w in data["readiness_warnings"])


def test_pre_submission_review_ready(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # Mark work as approved
    work_obj = db_session.get(Work, work_id)
    work_obj.review_status = "APPROVED"
    work_obj.status = "Ready for Submission"

    # Add an approved generated form
    gen_form = GeneratedFormRecord(
        work_id=work_id,
        client_id=client_id,
        form_code="FORM_XII",
        form_title="Form XII Directors Return",
        version=1,
        file_path="storage/generated/test.pdf",
        file_name="test_form_xii.pdf",
        status="APPROVED_FOR_PORTAL_UPLOAD",
        missing_fields=[]
    )
    db_session.add(gen_form)

    # Complete any checklist items
    chks = db_session.query(WorkChecklist).filter(WorkChecklist.work_id == work_id).all()
    for c in chks:
        c.status = "COMPLETED"

    db_session.commit()

    res = client.get(f"/api/submissions/work/{work_id}/pre-submission-review")
    assert res.status_code == 200
    data = res.json()

    assert data["is_approved_for_submission"] is True
    assert len(data["approved_forms"]) >= 1
    assert data["is_submission_ready"] is True


def test_manual_submission_creation_and_status(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # Missing tracking number must fail validation
    bad_res = client.post(f"/api/submissions/work/{work_id}", json={
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "submitted_by": "Senior Officer",
        "rjsc_tracking_no": ""
    })
    assert bad_res.status_code == 422

    # Valid manual submission
    now_iso = datetime.now(timezone.utc).isoformat()
    sub_res = client.post(f"/api/submissions/work/{work_id}", json={
        "submitted_at": now_iso,
        "submitted_by": "Senior Officer Tanvir",
        "rjsc_tracking_no": "RJSC-DHAKA-2026-998822",
        "portal_ack_ref": "ACK-88129",
        "govt_fee_challan_ref": "CHALLAN-SONALI-7711",
        "forms_submitted": [
            {"form_code": "FORM_XII", "form_title": "Form XII", "version": 1, "file_name": "form12.pdf"}
        ],
        "notes": "Uploaded manually to RJSC portal; fee paid via Sonali Bank."
    })
    assert sub_res.status_code == 201
    sub_data = sub_res.json()

    assert sub_data["rjsc_tracking_no"] == "RJSC-DHAKA-2026-998822"
    assert sub_data["submission_number"] == 1
    assert sub_data["submission_type"] == "INITIAL"
    assert sub_data["status"] == "SUBMITTED"

    # Work status should be advanced to 'Submitted'
    db_session.expire_all()
    work_obj = db_session.get(Work, work_id)
    assert work_obj.status == "Submitted"
    assert work_obj.submitted_at is not None


def test_rjsc_query_and_correction_task(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # First record submission
    now_iso = datetime.now(timezone.utc).isoformat()
    sub_res = client.post(f"/api/submissions/work/{work_id}", json={
        "submitted_at": now_iso,
        "submitted_by": "Officer Tanvir",
        "rjsc_tracking_no": "RJSC-QUERY-TEST-1234",
    })
    assert sub_res.status_code == 201
    submission_id = sub_res.json()["id"]

    # Now RJSC raises an objection
    query_payload = {
        "submission_id": submission_id,
        "query_date": "2026-10-15",
        "query_reference": "RJSC/OBJ/DHAKA/2026/0491",
        "query_subject": "Clarification on Director e-TIN and NID",
        "query_description": "RJSC officer requested clear copy of Director NID and updated 12-digit e-TIN certificate.",
        "assigned_to": "Junior Compliance Officer",
        "deadline_date": "2026-10-25",
        "create_correction_task": True
    }
    q_res = client.post(f"/api/submissions/{submission_id}/query", json=query_payload)
    assert q_res.status_code == 201
    q_data = q_res.json()

    assert q_data["query_subject"] == "Clarification on Director e-TIN and NID"
    assert q_data["status"] == "OPEN"
    assert q_data["linked_task_id"] is not None

    # Verify task was created in tasks table
    task_id = uuid.UUID(q_data["linked_task_id"])
    task_obj = db_session.get(Task, task_id)
    assert task_obj is not None
    assert "RJSC Objection" in task_obj.title
    assert task_obj.priority == "HIGH"
    assert task_obj.due_date == date(2026, 10, 25)

    # Verify Work status updated to Query/Follow-up
    db_session.expire_all()
    work_obj = db_session.get(Work, work_id)
    assert work_obj.status == "Query/Follow-up"


def test_resubmission_and_query_resolution(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # 1. Submission
    now_iso = datetime.now(timezone.utc).isoformat()
    sub_res = client.post(f"/api/submissions/work/{work_id}", json={
        "submitted_at": now_iso,
        "submitted_by": "Officer Tanvir",
        "rjsc_tracking_no": "RJSC-INIT-5566",
    })
    parent_sub_id = sub_res.json()["id"]

    # 2. Query
    q_res = client.post(f"/api/submissions/{parent_sub_id}/query", json={
        "submission_id": parent_sub_id,
        "query_date": "2026-10-16",
        "query_subject": "Address discrepancy",
        "query_description": "Registered office address differs from lease deed.",
        "deadline_date": "2026-10-26",
        "create_correction_task": True
    })
    query_id = q_res.json()["id"]

    # 3. Resubmission
    resub_res = client.post(f"/api/submissions/work/{work_id}/resubmit", json={
        "parent_submission_id": parent_sub_id,
        "submitted_at": now_iso,
        "submitted_by": "Senior Officer",
        "rjsc_tracking_no": "RJSC-RESUB-7788",
        "resolves_query_id": query_id,
        "resolution_notes": "Submitted updated lease deed and board explanation.",
        "notes": "Second portal upload after correction."
    })
    assert resub_res.status_code == 201
    resub_data = resub_res.json()

    assert resub_data["submission_type"] == "RESUBMISSION"
    assert resub_data["submission_number"] == 2
    assert resub_data["parent_submission_id"] == parent_sub_id

    # Verify original submission record is preserved!
    parent_sub = db_session.get(WorkSubmissionRecord, uuid.UUID(parent_sub_id))
    assert parent_sub is not None
    assert parent_sub.submission_number == 1

    # Verify query was marked resolved
    db_session.expire_all()
    q_obj = db_session.get(WorkQueryRecord, uuid.UUID(query_id))
    assert q_obj.status == "RESOLVED"
    assert q_obj.resolved_at is not None

    # Verify work status returned to Submitted
    work_obj = db_session.get(Work, work_id)
    assert work_obj.status == "Submitted"


def test_final_delivery_and_corporate_history(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # Record initial submission
    now_iso = datetime.now(timezone.utc).isoformat()
    client.post(f"/api/submissions/work/{work_id}", json={
        "submitted_at": now_iso,
        "submitted_by": "Officer Tanvir",
        "rjsc_tracking_no": "RJSC-FINAL-9900",
    })

    # Record final approval and delivery
    del_res = client.post(f"/api/submissions/work/{work_id}/delivery", json={
        "outcome": "APPROVED",
        "outcome_date": "2026-10-20",
        "rjsc_approval_ref": "RJSC-CERT-APPROVAL-2026-4433",
        "certified_copy_document_name": "Certified_Form_XII.pdf",
        "delivered_to_client_at": now_iso,
        "delivered_by": "Partner Rahman",
        "delivery_method": "HAND_DELIVERY",
        "client_ack_ref": "CLIENT-SIGNED-CHALLAN-01",
        "notes": "Certified copy handed to Managing Director with signed acknowledgement.",
        "close_work_operationally": True
    })
    assert del_res.status_code == 200
    del_data = del_res.json()

    assert del_data["outcome"] == "APPROVED"
    assert del_data["corporate_history_filing_id"] is not None

    # Verify corporate history filing record was created
    filing_id = uuid.UUID(del_data["corporate_history_filing_id"])
    filing_obj = db_session.get(RjscFilingHistory, filing_id)
    assert filing_obj is not None
    assert filing_obj.client_id == client_id
    assert filing_obj.status == "APPROVED"
    assert filing_obj.reference == "RJSC-CERT-APPROVAL-2026-4433"

    # Verify Work is operational closed
    db_session.expire_all()
    work_obj = db_session.get(Work, work_id)
    assert work_obj.status == "Closed"
    assert work_obj.completed_at is not None


def test_history_and_dashboard(client, test_client_and_work, db_session):
    client_id, work_id = test_client_and_work

    # Check history endpoint
    h_res = client.get(f"/api/submissions/work/{work_id}/history")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert "submissions" in h_data
    assert "active_queries" in h_data
    assert "resolved_queries" in h_data

    # Check dashboard endpoint
    dash_res = client.get("/api/submissions/dashboard")
    assert dash_res.status_code == 200
    d_data = dash_res.json()
    assert "ready_for_submission_count" in d_data
    assert "submitted_count" in d_data
    assert "open_queries_count" in d_data
