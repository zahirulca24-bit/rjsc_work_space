import pytest
from fastapi.testclient import TestClient
import os
import sys

# Ensure backend folder is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set SQLite memory DB for CRUD tests
os.environ["DATABASE_URL"] = "sqlite:///test.db"

from app.main import app
from app.db.base import Base
from app.db.session import engine
from app import models

# Create tables
import contextlib
with contextlib.suppress(FileNotFoundError):
    os.remove('test.db')
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_create_client():
    response = client.post("/api/clients", json={
        "legal_name": "Test Company",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-12345"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["client_code"] == "RJSC-0001"
    assert data["legal_name"] == "Test Company"
    assert "id" in data

def test_duplicate_registration_no():
    response = client.post("/api/clients", json={
        "legal_name": "Another Company",
        "entity_type": "PUBLIC_COMPANY",
        "registration_no": "C-12345"
    })
    assert response.status_code == 409

def test_second_client_increments_code():
    response = client.post("/api/clients", json={
        "legal_name": "Another Company",
        "entity_type": "PUBLIC_COMPANY",
        "registration_no": "C-54321"
    })
    assert response.status_code == 200
    assert response.json()["client_code"] == "RJSC-0002"

def test_invalid_entity_type_rejected():
    response = client.post("/api/clients", json={
        "legal_name": "Invalid",
        "entity_type": "INVALID_TYPE"
    })
    assert response.status_code == 422

def test_get_and_update_client():
    resp = client.post("/api/clients", json={
        "legal_name": "Update Me",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-999"
    })
    client_id = resp.json()["id"]

    resp2 = client.patch(f"/api/clients/{client_id}", json={
        "legal_name": "Updated Name"
    })
    assert resp2.status_code == 200
    assert resp2.json()["legal_name"] == "Updated Name"

def test_history_endpoints():
    resp = client.post("/api/clients", json={
        "legal_name": "History Test",
        "entity_type": "PRIVATE_COMPANY"
    })
    client_id = resp.json()["id"]

    resp2 = client.post(f"/api/clients/{client_id}/registered-office-history", json={
        "address": "123 Old St",
        "effective_from": "2020-01-01"
    })
    assert resp2.status_code == 200

    resp3 = client.post(f"/api/clients/{client_id}/registered-office-history", json={
        "address": "456 New St",
        "effective_from": "2023-01-01"
    })
    assert resp3.status_code == 200

    # Current position
    resp4 = client.get(f"/api/clients/{client_id}/current-position")
    assert resp4.status_code == 200
    assert resp4.json()["current_registered_office"] == "456 New St"

    # History list
    resp5 = client.get(f"/api/clients/{client_id}/history")
    assert resp5.status_code == 200
    assert len(resp5.json()["registered_office_history"]) == 2

def test_work_creation():
    resp = client.post("/api/clients", json={
        "legal_name": "Work Client",
        "entity_type": "PRIVATE_COMPANY"
    })
    client_id = resp.json()["id"]

    work_resp = client.post("/api/works", json={
        "work_code": "will_be_ignored",
        "client_id": client_id,
        "service_id": "S1",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING",
        "professional_fee": "100.00"
    })
    assert work_resp.status_code == 200
    data = work_resp.json()
    assert data["work_code"] == "WORK-0001"
    assert data["government_fee"] is None
    assert data["total_bill"] is None

    work_resp2 = client.post("/api/works", json={
        "work_code": "ignored",
        "client_id": client_id,
        "service_id": "S2",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING",
        "professional_fee": "100.00",
        "government_fee": "200.00",
        "other_cost": "50.00",
        "rule_snapshot": {
            "fee_rule_id": "R123"
        }
    })
    assert work_resp2.status_code == 200
    data2 = work_resp2.json()
    assert float(data2["total_bill"]) == 350.00

def test_all_history_endpoints_post_and_patch():
    # 1. Create client
    response = client.post("/api/clients", json={
        "legal_name": "History Test Corp",
        "entity_type": "PRIVATE_COMPANY"
    })
    assert response.status_code == 200
    client_id = response.json()["id"]

    # Endpoints to test
    endpoints = [
        ("name-history", {"previous_name": "Old", "new_name": "New", "effective_date": "2023-01-01"}, {"previous_name": "Old", "new_name": "Newer"}),
        ("registered-office-history", {"address": "123 Old St", "effective_from": "2023-01-01"}, {"address": "123 New St"}),
        ("capital-history", {"authorized_capital": 1000, "paid_up_capital": 100, "effective_date": "2023-01-01"}, {"authorized_capital": 1000, "paid_up_capital": 500}),
        ("directors", {"full_name": "John Doe", "is_current": True, "appointment_date": "2023-01-01"}, {"full_name": "John Doe", "is_current": False}),
        ("shareholders", {"shareholder_name": "Jane", "share_count": 100, "share_value": 10, "effective_from": "2023-01-01"}, {"shareholder_name": "Jane", "share_count": 200, "share_value": 10}),
        ("agm-history", {"financial_year": "2022-2023", "agm_date": "2023-06-01", "status": "HELD"}, {"financial_year": "2022-2023", "status": "NOT HELD"}),
        ("annual-returns", {"financial_year": "2022-2023", "filed_date": "2023-07-01"}, {"financial_year": "2023-2024"}),
        ("filings", {"service_type": "Form XII", "submission_date": "2023-01-01", "status": "PENDING"}, {"service_type": "Form XII", "status": "APPROVED"}),
        ("mortgage-charges", {"secured_amount": 50000, "lender": "Sonali Bank", "creation_date": "2023-01-01", "status": "ACTIVE"}, {"secured_amount": 50000, "lender": "Rupali Bank"}),
        ("compliance-issues", {"title": "Missing Return", "identified_date": "2023-01-01", "status": "PENDING", "category": "GENERAL", "severity": "MEDIUM"}, {"title": "Missing Return", "severity": "HIGH"})
    ]

    for ep, post_data, patch_data in endpoints:
        # POST
        r = client.post(f"/api/clients/{client_id}/{ep}", json=post_data)
        assert r.status_code == 200, f"POST {ep} failed: {r.text}"
        record_id = r.json()["id"]

        # POST another one to ensure editing one preserves another
        r2 = client.post(f"/api/clients/{client_id}/{ep}", json=post_data)
        record2_id = r2.json()["id"]

        # PATCH the first one
        rp = client.patch(f"/api/clients/{client_id}/{ep}/{record_id}", json=patch_data)
        assert rp.status_code == 200, f"PATCH {ep} failed: {rp.text}"

        # Verify first one is updated
        res = client.get(f"/api/clients/{client_id}/history")
        history_key = ep.replace("-", "_")
        if ep == "annual-returns":
            history_key = "annual_returns"
        records = res.json()[history_key]
        assert len(records) == 2
        
        updated_record = next(rec for rec in records if rec["id"] == record_id)
        other_record = next(rec for rec in records if rec["id"] == record2_id)

        # Check values
        for k, v in patch_data.items():
            assert updated_record[k] == v
            assert other_record[k] == post_data.get(k, other_record[k]) # The other shouldn't change

def test_current_position():
    response = client.post("/api/clients", json={"legal_name": "CP Corp", "entity_type": "PRIVATE_COMPANY"})
    client_id = response.json()["id"]
    
    client.post(f"/api/clients/{client_id}/directors", json={"full_name": "D1", "is_current": False})
    client.post(f"/api/clients/{client_id}/directors", json={"full_name": "D2", "is_current": True})
    
    res = client.get(f"/api/clients/{client_id}/current-position")
    assert res.status_code == 200
    data = res.json()
    assert len(data["current_directors"]) == 1
    assert data["current_directors"][0]["full_name"] == "D2"

def test_work_snapshot_and_rollback():
    from sqlalchemy.orm import Session
    from app.db.session import engine
    db_session = Session(engine)
    response = client.post("/api/clients", json={"legal_name": "Work Corp", "entity_type": "PRIVATE_COMPANY"})
    client_id = response.json()["id"]

    work_data = {
        "client_id": client_id,
        "service_id": "SV1",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING",
        "rule_snapshot": {
            "fee_rule_id": "RULE-123"
        }
    }
    w_res = client.post("/api/works", json=work_data)
    assert w_res.status_code == 200
    work_id = w_res.json()["id"]

    import uuid
    from app.models.work import WorkRuleSnapshot
    snap = db_session.query(WorkRuleSnapshot).filter(WorkRuleSnapshot.work_id == uuid.UUID(work_id)).first()
    assert snap is not None
    assert snap.fee_rule_id == "RULE-123"
