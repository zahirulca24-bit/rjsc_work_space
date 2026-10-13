import pytest
from app.main import app
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.corporate_history import Director, Shareholder, AgmHistory, CapitalHistory, RegisteredOfficeHistory
from app.models.document import Document
import uuid
from datetime import date

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

def test_working_paper_auto_initialization_from_client_master(client, db_session):
    _auth(RoleEnum.ADMIN)

    # 1. Create Client with verified records
    c_res = client.post("/api/clients", json={
        "legal_name": "Bengal Logistics Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-55443"
    })
    assert c_res.status_code == 200
    client_id = c_res.json()["id"]

    # Add registered office history
    db_session.add(RegisteredOfficeHistory(
        client_id=uuid.UUID(client_id),
        address="House 12, Road 4, Banani, Dhaka-1213",
        effective_from=date(2022, 1, 1)
    ))
    # Add capital history
    db_session.add(CapitalHistory(
        client_id=uuid.UUID(client_id),
        authorized_capital=10000000,
        paid_up_capital=5000000,
        effective_date=date(2022, 1, 1)
    ))
    # Add directors
    db_session.add(Director(
        client_id=uuid.UUID(client_id),
        full_name="Rafiqul Islam",
        designation="Managing Director",
        is_current=True,
        appointment_date=date(2022, 1, 1)
    ))
    db_session.add(Director(
        client_id=uuid.UUID(client_id),
        full_name="Nasreen Sultana",
        designation="Director",
        is_current=True,
        appointment_date=date(2022, 1, 1)
    ))
    # Add shareholder
    db_session.add(Shareholder(
        client_id=uuid.UUID(client_id),
        shareholder_name="Rafiqul Islam",
        share_count=30000,
        share_value=100,
        is_current=True
    ))
    # Add AGM
    db_session.add(AgmHistory(
        client_id=uuid.UUID(client_id),
        financial_year="2022-2023",
        agm_date=date(2023, 12, 15),
        status="HELD",
        source_document="Signed AGM Minutes 2023"
    ))
    db_session.commit()

    # 2. Create Work for this client
    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "annual-return",
        "entity_type": "PRIVATE_COMPANY",
        "period_or_year": "2022-2023",
        "status": "In Preparation"
    })
    assert w_res.status_code == 200
    work_id = w_res.json()["id"]

    # 3. Initialize Working Paper for the Work
    wp_res = client.post(f"/api/working-papers/work/{work_id}/init")
    assert wp_res.status_code == 200
    wp = wp_res.json()

    assert wp["work_id"] == work_id
    assert wp["client_id"] == client_id
    assert wp["status"] == "DRAFT"

    # Verify Company Data auto-filled
    cdata = wp["company_data"]
    assert cdata["legal_name"] == "Bengal Logistics Ltd"
    assert cdata["registration_no"] == "C-55443"
    assert cdata["registered_office"] == "House 12, Road 4, Banani, Dhaka-1213"
    assert cdata["authorized_capital"] == 10000000
    assert cdata["paid_up_capital"] == 5000000

    # Verify Directors auto-filled
    assert len(wp["directors_data"]) == 2
    dir_names = [d["full_name"] for d in wp["directors_data"]]
    assert "Rafiqul Islam" in dir_names
    assert "Nasreen Sultana" in dir_names

    # Verify Shareholders auto-filled
    assert len(wp["shareholders_data"]) == 1
    assert wp["shareholders_data"][0]["shareholder_name"] == "Rafiqul Islam"

    # Verify AGM Analysis Worksheet
    assert len(wp["agm_analysis"]) >= 1
    row = wp["agm_analysis"][0]
    assert row["financial_year"] == "2022-2023"
    assert row["actual_agm_date"] == "2023-12-15"
    assert row["agm_status"] == "HELD"
    # Sec 36 filing deadline = 2023-12-15 + 21 days = 2024-01-05
    assert row["statutory_filing_deadline"] == "2024-01-05"
    assert "Sec 36" in row["calculation_basis"]

def test_working_paper_snapshot_isolation_from_master_updates(client, db_session):
    _auth(RoleEnum.ADMIN)

    # 1. Create client and work
    c_res = client.post("/api/clients", json={
        "legal_name": "Original Name Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-99001"
    })
    client_id = c_res.json()["id"]

    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "annual-return",
        "entity_type": "PRIVATE_COMPANY",
        "status": "In Preparation"
    })
    work_id = w_res.json()["id"]

    # 2. Initialize working paper
    wp_res = client.post(f"/api/working-papers/work/{work_id}/init")
    wp_id = wp_res.json()["id"]
    assert wp_res.json()["company_data"]["legal_name"] == "Original Name Ltd"

    # 3. Update Client Master directly (e.g. legal name changed or new profile edit)
    client.patch(f"/api/clients/{client_id}", json={
        "legal_name": "New Changed Name Ltd"
    })

    # 4. Fetch the existing Working Paper — snapshot MUST preserve original value
    wp_after = client.get(f"/api/working-papers/{wp_id}").json()
    assert wp_after["company_data"]["legal_name"] == "Original Name Ltd"

    # 5. Non-destructive refresh should allow explicit re-sync when requested
    refresh_res = client.post(f"/api/working-papers/{wp_id}/refresh")
    assert refresh_res.status_code == 200
    assert refresh_res.json()["company_data"]["legal_name"] == "New Changed Name Ltd"

def test_agm_dvc_audit_separation_and_compliance_rules(client, db_session):
    _auth(RoleEnum.ADMIN)

    # Client without evidenced AGM
    c_res = client.post("/api/clients", json={
        "legal_name": "No AGM Evidenced Ltd",
        "entity_type": "PRIVATE_COMPANY"
    })
    client_id = c_res.json()["id"]

    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "annual-return",
        "entity_type": "PRIVATE_COMPANY",
        "period_or_year": "2023-2024",
        "status": "In Preparation"
    })
    work_id = w_res.json()["id"]

    wp = client.post(f"/api/working-papers/work/{work_id}/init").json()

    # Verify AGM analysis worksheet flags missing AGM evidence and does NOT guess
    analysis = wp["agm_analysis"]
    assert len(analysis) >= 1
    row = analysis[0]
    assert row["actual_agm_date"] is None
    assert row["statutory_filing_deadline"] is None
    assert row["compliance_assessment"] == "REVIEW_REQUIRED"
    assert any("AGM date is not yet evidenced" in msg for msg in row["missing_or_conflicting_evidence"])
    assert "Audit/DVC date does not constitute evidence of AGM" in row["calculation_basis"]

def test_working_paper_review_lifecycle(client, db_session):
    _auth(RoleEnum.JUNIOR)

    c_res = client.post("/api/clients", json={
        "legal_name": "Review Flow Corp",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-77889"
    })
    client_id = c_res.json()["id"]

    w_res = client.post("/api/works", json={
        "client_id": client_id,
        "service_id": "change-return-form-xii",
        "entity_type": "PRIVATE_COMPANY",
        "status": "In Preparation"
    })
    work_id = w_res.json()["id"]

    wp = client.post(f"/api/working-papers/work/{work_id}/init").json()
    wp_id = wp["id"]
    assert wp["status"] == "DRAFT"

    # Junior submits for review
    sub_res = client.post(f"/api/working-papers/{wp_id}/review-action", json={
        "action": "SUBMIT_FOR_REVIEW",
        "notes": "Completed initial draft and verified director records."
    })
    assert sub_res.status_code == 200
    assert sub_res.json()["status"] == "IN_REVIEW"

    # Junior cannot approve
    assert client.post(f"/api/working-papers/{wp_id}/review-action", json={"action": "APPROVE"}).status_code == 403

    # Senior approves
    _auth(RoleEnum.SENIOR)
    app_res = client.post(f"/api/working-papers/{wp_id}/review-action", json={
        "action": "APPROVE",
        "notes": "Reviewed against Form XII source records. Approved."
    })
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED"
    assert app_res.json()["reviewed_at"] is not None
