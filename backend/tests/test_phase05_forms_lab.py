import io
import uuid
from datetime import date
import pytest
import pypdf

from app.main import app
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
from app.models.client import Client
from app.models.work import Work
from app.models.corporate_history import Director, Shareholder, CapitalHistory, AgmHistory, RegisteredOfficeHistory
from app.models.generated_form import GeneratedFormRecord

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
def setup_phase05_work(client, db_session):
    _auth(RoleEnum.ADMIN)
    u_id = uuid.uuid4().hex[:6]

    # 1. Create client with unique reg no
    c_res = client.post("/api/clients", json={
        "legal_name": f"ACME LABS {u_id} LIMITED",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": f"C-{u_id}"
    })
    assert c_res.status_code == 200
    client_id = uuid.UUID(c_res.json()["id"])

    # 2. Add Registered Office
    db_session.add(RegisteredOfficeHistory(
        client_id=client_id,
        address="Paramount Heights, 502 Motijheel C/A, Dhaka-1000",
        effective_from=date(2021, 3, 15)
    ))

    # 3. Add Capital
    db_session.add(CapitalHistory(
        client_id=client_id,
        authorized_capital=20000000,
        paid_up_capital=10000000,
        effective_date=date(2021, 3, 15)
    ))

    # 4. Add 7 Directors to test multi-page continuation sheet (> 6 directors capacity)
    for i in range(1, 8):
        db_session.add(Director(
            client_id=client_id,
            full_name=f"Director Name {i}",
            designation="Managing Director" if i == 1 else "Director",
            nid_or_passport_reference=f"NID-{i}0000",
            notes=f"House #{i}, Road #{i*2}, Banani, Dhaka-1213",
            appointment_date=date(2021, 3, 15),
            is_current=True
        ))

    # 5. Add Shareholders
    for i in range(1, 4):
        db_session.add(Shareholder(
            client_id=client_id,
            shareholder_name=f"Shareholder {i}",
            share_count=50000 if i == 1 else 25000,
            share_value=100,
            ownership_percentage=50 if i == 1 else 25,
            is_current=True
        ))

    # 6. Add Evidenced AGM
    db_session.add(AgmHistory(
        client_id=client_id,
        financial_year="2022-2023",
        agm_date=date(2023, 12, 20),
        status="HELD",
        source_document="Signed Board Minutes & AGM Attendance Sheet"
    ))

    db_session.commit()

    # 7. Create Work Order
    w_res = client.post("/api/works", json={
        "client_id": str(client_id),
        "service_id": "annual-return",
        "entity_type": "PRIVATE_COMPANY",
        "period_or_year": "2022-2023",
        "status": "In Preparation",
        "notes": "Forms Lab test work order"
    })
    assert w_res.status_code == 200
    work_id = w_res.json()["id"]

    return {"client_id": str(client_id), "work_id": work_id, "legal_name": f"ACME LABS {u_id} LIMITED"}

def test_template_inventory_endpoint(client, db_session):
    """Verifies that all 31 RJSC statutory templates are inventoried with metadata."""
    _auth(RoleEnum.ADMIN)
    res = client.get("/api/forms-lab/templates")
    assert res.status_code == 200
    templates = res.json()
    assert len(templates) == 31

    codes = [t["form_code"] for t in templates]
    assert "FORM_XII" in codes
    assert "SCHEDULE_X" in codes
    assert "FORM_23B" in codes
    assert "FORM_VI" in codes
    assert "FORM_117" in codes

    form_xii = next(t for t in templates if t["form_code"] == "FORM_XII")
    assert form_xii["status"] == "LIVE_AUTOFILL_READY"
    assert form_xii["orientation"] == "LANDSCAPE"

def test_preflight_check(client, setup_phase05_work):
    """Verifies preflight checks identifying verified and missing data."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]

    res = client.get(f"/api/forms-lab/preflight/{work_id}/FORM_XII")
    assert res.status_code == 200
    data = res.json()
    assert data["form_code"] == "FORM_XII"
    assert data["is_fillable"] is True
    assert len(data["verified_fields"]) > 0

def test_generate_form_xii_pdf_with_continuation_sheet(client, setup_phase05_work):
    """
    Verifies Form XII generation with > 6 directors dynamically produces a 2-page PDF
    containing the official base page and a continuation sheet.
    """
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]
    legal_name = setup_phase05_work["legal_name"]

    payload = {
        "filing_by": "Zahir & Associate (Chartered Accountants)",
        "dated_str": "2023-12-28"
    }

    res = client.post(f"/api/forms-lab/generate/{work_id}/FORM_XII", json=payload)
    if res.status_code != 200:
        print("GEN ERROR:", res.status_code, res.json())
    assert res.status_code == 200
    gen_data = res.json()

    assert gen_data["form_code"] == "FORM_XII"
    assert gen_data["version"] == 1
    assert gen_data["page_count"] == 2  # 7 directors > 6 capacity -> 2 pages
    assert gen_data["status"] == "DRAFT"

    # Verify download and file integrity
    record_id = gen_data["id"]
    dl_res = client.get(f"/api/forms-lab/download/{record_id}")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"

    # Inspect PDF contents
    reader = pypdf.PdfReader(io.BytesIO(dl_res.content))
    assert len(reader.pages) == 2
    p1_text = reader.pages[0].extract_text()
    assert legal_name in p1_text
    assert "Director Name 1" in p1_text

    p2_text = reader.pages[1].extract_text()
    assert "CONTINUATION SHEET" in p2_text
    assert "Director Name 7" in p2_text

def test_generate_schedule_x_pdf(client, setup_phase05_work):
    """Verifies Schedule X generation with capital figures and Member register."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]
    legal_name = setup_phase05_work["legal_name"]

    payload = {
        "actual_agm_date": "2023-12-20"
    }

    res = client.post(f"/api/forms-lab/generate/{work_id}/SCHEDULE_X", json=payload)
    assert res.status_code == 200
    gen_data = res.json()

    assert gen_data["form_code"] == "SCHEDULE_X"
    assert gen_data["version"] == 1
    assert gen_data["page_count"] >= 2

    # Download and verify
    record_id = gen_data["id"]
    dl_res = client.get(f"/api/forms-lab/download/{record_id}")
    assert dl_res.status_code == 200

    reader = pypdf.PdfReader(io.BytesIO(dl_res.content))
    p1_text = reader.pages[0].extract_text()
    assert legal_name in p1_text
    assert "20,000,000" in p1_text  # Auth capital
    assert "10,000,000" in p1_text  # Paid up capital

def test_generated_form_versioning_and_review_lifecycle(client, setup_phase05_work):
    """Verifies that regenerating a form increments version (v1 -> v2) and review actions work."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]

    # Generate version 1 of Schedule X
    res1 = client.post(f"/api/forms-lab/generate/{work_id}/SCHEDULE_X", json={"actual_agm_date": "2023-12-20"})
    assert res1.status_code == 200
    assert res1.json()["version"] == 1

    # Generate version 2 of Schedule X
    res2 = client.post(f"/api/forms-lab/generate/{work_id}/SCHEDULE_X", json={"actual_agm_date": "2023-12-20"})
    assert res2.status_code == 200
    assert res2.json()["version"] == 2
    record_id = res2.json()["id"]

    # History endpoint
    hist_res = client.get(f"/api/forms-lab/history/{work_id}")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 2

    # Review Action: DRAFT -> REVIEWED
    rev_res = client.patch(
        f"/api/forms-lab/review/{record_id}",
        json={"new_status": "REVIEWED", "review_notes": "Checked against verified signed minutes."}
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVIEWED"

    # Review Action: REVIEWED -> APPROVED_FOR_PORTAL_UPLOAD
    app_res = client.patch(
        f"/api/forms-lab/review/{record_id}",
        json={"new_status": "APPROVED_FOR_PORTAL_UPLOAD", "review_notes": "Senior approved for manual RJSC upload."}
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == "APPROVED_FOR_PORTAL_UPLOAD"

    # Reject unproven PORTAL_ACCEPTED
    bad_res = client.patch(
        f"/api/forms-lab/review/{record_id}",
        json={"new_status": "PORTAL_ACCEPTED"}
    )
    assert bad_res.status_code == 400
    assert "Portal acceptance cannot be marked without portal acknowledgement proof" in bad_res.json()["detail"]

def test_preflight_form_117(client, setup_phase05_work):
    """Verifies preflight checks for Form 117 (share transfer)."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]

    res = client.get(f"/api/forms-lab/preflight/{work_id}/FORM_117")
    assert res.status_code == 200
    data = res.json()
    assert data["form_code"] == "FORM_117"
    assert data["is_fillable"] is True
    verified = [f["field"] for f in data["verified_fields"]]
    assert "legal_name" in verified
    assert "transferor_candidate" in verified
    assert "transferee_candidate" in verified

def test_generate_form_117_pdf(client, setup_phase05_work):
    """Verifies Form 117 share transfer deed generation with coordinate overlay."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]
    legal_name = setup_phase05_work["legal_name"]

    payload = {
        "transfer_no": "T-2024-01",
        "transferor_name": "Rahim Ahmed",
        "transferor_address": "House 12, Road 4, Dhanmondi, Dhaka",
        "transferee_name": "Karim Chowdhury",
        "transferee_address": "Flat 5B, Gulshan Avenue, Dhaka",
        "share_count": 500,
        "nominal_value": 100,
        "paid_up_per_share": 100,
        "consideration_amount": 50000,
        "distinctive_from": 1,
        "distinctive_to": 500,
        "dated_str": "2024-05-15",
        "board_approval_date": "2024-05-10"
    }

    res = client.post(f"/api/forms-lab/generate/{work_id}/FORM_117", json=payload)
    assert res.status_code == 200
    gen_data = res.json()

    assert gen_data["form_code"] == "FORM_117"
    assert gen_data["version"] == 1
    assert gen_data["page_count"] == 1
    assert gen_data["status"] == "DRAFT"

    # Download and verify PDF
    record_id = gen_data["id"]
    dl_res = client.get(f"/api/forms-lab/download/{record_id}")
    assert dl_res.status_code == 200

    reader = pypdf.PdfReader(io.BytesIO(dl_res.content))
    assert len(reader.pages) == 1
    p1_text = reader.pages[0].extract_text()
    assert legal_name in p1_text
    assert "Rahim Ahmed" in p1_text
    assert "Karim Chowdhury" in p1_text
    assert "500" in p1_text
    assert "50,000" in p1_text
    assert "2024" in p1_text

def test_schedule_x_shareholding_mismatch_warning(client, setup_phase05_work, db_session):
    """Verifies Schedule X detects when sum of member shares != issued shares from paid-up capital."""
    _auth(RoleEnum.ADMIN)
    work_id = setup_phase05_work["work_id"]

    # In setup_phase05_work:
    # paid_up_capital = 10,000,000; nominal = 100 -> issued_shares = 100,000
    # sum = 50,000 + 25,000 + 25,000 = 100,000 (matches)
    pre_res = client.get(f"/api/forms-lab/preflight/{work_id}/SCHEDULE_X")
    assert pre_res.status_code == 200
    warnings = pre_res.json()["warnings"]
    assert not any("Shareholding mismatch" in w for w in warnings)

    # Add extra shareholder creating mismatch
    client_id = uuid.UUID(setup_phase05_work["client_id"])
    db_session.add(Shareholder(
        client_id=client_id,
        shareholder_name="Extra Shareholder",
        share_count=10000,
        share_value=100,
        ownership_percentage=10,
        is_current=True
    ))
    db_session.commit()

    # Preflight should now surface the mismatch warning
    pre_res2 = client.get(f"/api/forms-lab/preflight/{work_id}/SCHEDULE_X")
    assert pre_res2.status_code == 200
    warnings2 = pre_res2.json()["warnings"]
    assert any("Shareholding mismatch" in w for w in warnings2)

