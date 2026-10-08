import pytest
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ["DATABASE_URL"] = "sqlite:///test.db"

from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

from datetime import date
from uuid import uuid4
from decimal import Decimal

def create_client(client: TestClient):
    res = client.post("/api/clients", json={"client_code": f"CL-{uuid4()}", "legal_name": "Test Client", "entity_type": "PRIVATE_COMPANY"})
    return res.json()["id"]

def create_work(client: TestClient, client_id: str):
    res = client.post("/api/works", json={"client_id": client_id, "service_id": "SV-1", "work_code": f"WK-{uuid4()}", "status": "IN_PROGRESS", "entity_type": "PRIVATE_COMPANY"})
    return res.json()["id"]

def test_invoice_highest_code_increment(client: TestClient):
    cid = create_client(client)
    res1 = client.post("/api/invoices", json={"client_id": cid, "invoice_date": "2026-01-01", "professional_fee": 100, "government_fee": 0, "other_cost": 0})
    res2 = client.post("/api/invoices", json={"client_id": cid, "invoice_date": "2026-01-01", "professional_fee": 200, "government_fee": 0, "other_cost": 0})
    num1 = int(res1.json()["invoice_no"].split("-")[1])
    num2 = int(res2.json()["invoice_no"].split("-")[1])
    assert num2 > num1
    
def test_draft_cancelled_invoices(client: TestClient):
    cid = create_client(client)
    res_draft = client.post("/api/invoices", json={"client_id": cid, "invoice_date": "2026-01-01", "professional_fee": 100, "government_fee": 0, "other_cost": 0})
    inv_id = res_draft.json()["id"]
    client.patch(f"/api/invoices/{inv_id}", json={"status": "DRAFT"})
    
    # Try collect
    res_col = client.post("/api/transactions", json={
        "client_id": cid, "invoice_id": inv_id, "transaction_date": "2026-01-02", "transaction_type": "COLLECTION", "amount": 100
    })
    assert res_col.status_code == 400
    assert "DRAFT" in res_col.json()["detail"]
    
    # Cancel it
    client.patch(f"/api/invoices/{inv_id}", json={"status": "CANCELLED"})
    res_col = client.post("/api/transactions", json={
        "client_id": cid, "invoice_id": inv_id, "transaction_date": "2026-01-02", "transaction_type": "COLLECTION", "amount": 100
    })
    assert res_col.status_code == 400
    assert "CANCELLED" in res_col.json()["detail"]

def test_transaction_edit_safety(client: TestClient):
    cid = create_client(client)
    inv = client.post("/api/invoices", json={"client_id": cid, "invoice_date": "2026-01-01", "professional_fee": 1000, "government_fee": 0, "other_cost": 0}).json()
    txn = client.post("/api/transactions", json={
        "client_id": cid, "invoice_id": inv["id"], "transaction_date": "2026-01-02", "transaction_type": "COLLECTION", "amount": 500
    }).json()
    
    # Change type rejected
    res = client.patch(f"/api/transactions/{txn['id']}", json={"transaction_type": "REFUND"})
    assert res.status_code == 400
    assert "Cannot change" in res.json()["detail"]
    
    # Financial fields change ignored by Pydantic / safely untouched
    res2 = client.patch(f"/api/transactions/{txn['id']}", json={"amount": 999, "invoice_id": str(uuid4()), "client_id": str(uuid4())})
    assert res2.status_code == 200
    # Refetch
    txn_check = client.get(f"/api/transactions/{txn['id']}").json()
    assert float(txn_check["amount"]) == 500.0
    assert txn_check["invoice_id"] == inv["id"]
    assert txn_check["client_id"] == cid
    
    # Descriptive allowed
    res3 = client.patch(f"/api/transactions/{txn['id']}", json={"reference": "CHQ-123", "description": "Payment"})
    assert res3.status_code == 200
    txn_check = client.get(f"/api/transactions/{txn['id']}").json()
    assert txn_check["reference"] == "CHQ-123"
    assert txn_check["description"] == "Payment"

def test_analytics_basic(client: TestClient):
    res = client.get("/api/analytics/monthly?year=2026")
    assert res.status_code == 200
    assert len(res.json()) == 12
    assert type(res.json()[0]["billed"]) == str # Decimal serialization safety

def test_mom_yoy(client: TestClient):
    res = client.get("/api/analytics/mom")
    assert res.status_code == 200
    mom = res.json()["billed_mom"]
    yoy = res.json()["billed_yoy"]
    assert mom is None or type(mom) == str
    assert yoy is None or type(yoy) == str

def test_aging_boundaries(client: TestClient):
    res = client.get("/api/analytics/outstanding-aging")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 5
    assert data[0]["age_since_invoice"] == "0-30"

def test_client_financial_summary(client: TestClient):
    cid = create_client(client)
    res = client.get(f"/api/clients/{cid}/financial-summary")
    assert res.status_code == 200
    assert float(res.json()["total_billed"]) == 0.0

def test_work_financial_summary(client: TestClient):
    cid = create_client(client)
    wid = create_work(client, cid)
    res = client.get(f"/api/works/{wid}/financial-summary")
    assert res.status_code == 200
    assert res.json()["government_fee"] is None

def test_invoice_collection_flow(client: TestClient):
    cid = create_client(client)
    inv = client.post("/api/invoices", json={"client_id": cid, "invoice_date": "2026-01-01", "professional_fee": 1000, "government_fee": 0, "other_cost": 0}).json()
    assert inv["status"] == "ISSUED"
    assert float(inv["total_amount"]) == 1000.0
    
    # Partial collection
    res1 = client.post("/api/transactions", json={"client_id": cid, "invoice_id": inv["id"], "transaction_date": "2026-01-02", "transaction_type": "COLLECTION", "amount": 400})
    assert res1.status_code == 200
    inv_check1 = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv_check1["status"] == "PARTIALLY_PAID"
    assert float(inv_check1["total_amount"]) == 1000.0 # total never mutates
    
    # Additional collection
    res2 = client.post("/api/transactions", json={"client_id": cid, "invoice_id": inv["id"], "transaction_date": "2026-01-03", "transaction_type": "COLLECTION", "amount": 600})
    assert res2.status_code == 200
    inv_check2 = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv_check2["status"] == "PAID"
    assert float(inv_check2["total_amount"]) == 1000.0
    
    # Overcollection rejected
    res3 = client.post("/api/transactions", json={"client_id": cid, "invoice_id": inv["id"], "transaction_date": "2026-01-04", "transaction_type": "COLLECTION", "amount": 100})
    assert res3.status_code == 400
    
    # Verify invoice status unchanged by rejected tx
    inv_check3 = client.get(f"/api/invoices/{inv['id']}").json()
    assert inv_check3["status"] == "PAID"
