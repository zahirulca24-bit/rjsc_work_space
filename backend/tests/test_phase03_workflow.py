import pytest
from app.main import app
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.work import Work, WorkChecklist
from app.models.document import Document
import uuid
from datetime import datetime

@pytest.fixture(autouse=True)
def clear_overrides():
    old = app.dependency_overrides.pop(get_current_user, None)
    yield
    if old:
        app.dependency_overrides[get_current_user] = old

def _auth_user(role=RoleEnum.ADMIN):
    user = User(
        id=uuid.uuid4(),
        name=f"{role.value} TestUser",
        email=f"{role.value.lower()}@test.com",
        role=role.value,
        is_active=True
    )
    app.dependency_overrides[get_current_user] = lambda: user
    return user

def test_work_checklist_autoseed_and_matching_client_docs(client, db_session):
    _auth_user(RoleEnum.ADMIN)
    
    # 1. Create client
    c_res = client.post("/api/clients", json={
        "legal_name": "Apex Holdings Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-98765"
    })
    assert c_res.status_code == 200
    client_id = c_res.json()["id"]

    # 2. Add an already-verified Incorporation document to client
    doc = Document(
        client_id=uuid.UUID(client_id),
        document_name="Certificate of Incorporation.pdf",
        category="INCORPORATION",
        status="VERIFIED"
    )
    db_session.add(doc)
    db_session.commit()

    # 3. Create work with annual-return service
    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "annual-return",
        "entity_type": "PRIVATE_COMPANY",
        "status": "Pending Check",
        "professional_fee": 5000
    })
    assert w_res.status_code == 200
    work_id = w_res.json()["id"]

    # 4. Fetch checklist items
    chk_res = client.get(f"/api/works/{work_id}/checklist")
    assert chk_res.status_code == 200
    items = chk_res.json()
    assert len(items) == 5
    
    # Check item codes: Schedule X, Balance Sheet, Profit & Loss, Form 23B, AGM Notice
    item_codes = [i["item_code"] for i in items]
    assert "DOC_SCHED_X" in item_codes
    assert "DOC_BALANCE_SHEET" in item_codes
    assert "DOC_PROFIT_LOSS" in item_codes
    assert "DOC_FORM_23B" in item_codes
    assert "DOC_AGM_NOTICE" in item_codes
    assert "DOC_FORM_XII" not in item_codes

def test_add_update_delete_custom_checklist_item(client, db_session):
    _auth_user(RoleEnum.ADMIN)

    c_res = client.post("/api/clients", json={
        "legal_name": "Horizon Tech Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-11223"
    })
    client_id = c_res.json()["id"]

    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "custom-service",
        "entity_type": "PRIVATE_COMPANY",
        "status": "In Preparation"
    })
    work_id = w_res.json()["id"]

    # Add custom item
    add_res = client.post(f"/api/works/{work_id}/checklist", json={
        "item_text": "Bank Solvency Certificate",
        "source_reference": "Client Agreement Section 4",
        "status": "PENDING"
    })
    assert add_res.status_code == 200
    new_item = add_res.json()
    assert new_item["item_text"] == "Bank Solvency Certificate"
    assert new_item["status"] == "PENDING"
    item_id = new_item["id"]

    # Update item to COMPLETED
    patch_res = client.patch(f"/api/works/{work_id}/checklist/{item_id}", json={
        "status": "COMPLETED"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "COMPLETED"
    assert patch_res.json()["completed_at"] is not None

    # Delete item
    del_res = client.delete(f"/api/works/{work_id}/checklist/{item_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Confirm deletion
    chk_res = client.get(f"/api/works/{work_id}/checklist")
    assert not any(i["id"] == item_id for i in chk_res.json())

def test_work_status_lifecycle_and_review_workflow(client, db_session):
    _auth_user(RoleEnum.ADMIN)
    c_res = client.post("/api/clients", json={
        "legal_name": "Review Test Corp",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-44556"
    })
    client_id = c_res.json()["id"]

    # Junior creates work
    _auth_user(RoleEnum.JUNIOR)
    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "change-return-form-xii",
        "entity_type": "PRIVATE_COMPANY",
        "status": "In Preparation",
        "professional_fee": 3000
    })
    work_id = w_res.json()["id"]

    # Junior submits to senior
    sub_res = client.post(f"/api/works/{work_id}/review-actions", json={
        "action": "SUBMIT_TO_SENIOR"
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["new_status"] == "SUBMITTED_TO_SENIOR"

    # Verify work status automatically updated to 'Under Review'
    w_detail = client.get(f"/api/works/{work_id}").json()
    assert w_detail["status"] == "Under Review"

    # Senior approves to Manager
    _auth_user(RoleEnum.SENIOR)
    app_res = client.post(f"/api/works/{work_id}/review-actions", json={
        "action": "APPROVE_BY_SENIOR"
    })
    assert app_res.status_code == 200
    assert app_res.json()["new_status"] == "SUBMITTED_TO_MANAGER"

    # Manager final approves
    _auth_user(RoleEnum.MANAGER)
    final_res = client.post(f"/api/works/{work_id}/review-actions", json={
        "action": "FINAL_APPROVE"
    })
    assert final_res.status_code == 200
    assert final_res.json()["new_status"] == "APPROVED"

    # Verify work status updated to 'Ready for Submission'
    w_detail2 = client.get(f"/api/works/{work_id}").json()
    assert w_detail2["status"] == "Ready for Submission"

    # Update work status to 'Submitted' -> sets submitted_at
    sub_work_res = client.patch(f"/api/works/{work_id}", json={
        "status": "Submitted"
    })
    assert sub_work_res.status_code == 200
    assert sub_work_res.json()["submitted_at"] is not None
