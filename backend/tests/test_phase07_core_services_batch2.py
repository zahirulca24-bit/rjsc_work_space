import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_annual_return_assessment_and_work_creation():
    # 1. Create Client
    c_resp = client.post("/api/clients", json={
        "legal_name": "Acceptance Testing Annual Return Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-998877",
        "incorporation_date": "2021-01-15T00:00:00"
    })
    assert c_resp.status_code == 200
    client_id = c_resp.json()["id"]

    # 2. Add AGM history & Annual return history
    # FY 2021-2022: FILED
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2021-2022",
        "agm_date": "2022-12-15",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2021-2022",
        "actual_agm_date": "2022-12-15",
        "audit_report_date": "2022-11-20",
        "dvc_code": "221120CA9988",
        "filed_date": "2022-12-28", # Filed within 13 days of AGM
        "acknowledgement_reference": "AR-2022-9988"
    })

    # FY 2022-2023: OVERDUE (AGM held in Dec 2023, not filed)
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2022-2023",
        "agm_date": "2023-12-10",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2022-2023",
        "actual_agm_date": "2023-12-10",
        "audit_report_date": "2023-11-15",
        "dvc_code": "231115CA9988"
    })

    # 3. Request Assessment
    ass_resp = client.get(f"/api/annual-returns/assessment/{client_id}")
    assert ass_resp.status_code == 200
    ass_data = ass_resp.json()

    assert ass_data["client_id"] == client_id
    assert ass_data["filed_count"] >= 1
    assert ass_data["overdue_count"] >= 1

    # Find FY 2021-2022
    y_21 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2021-2022")
    assert y_21["filing_status"] == "FILED"
    assert y_21["dvc_code"] == "221120CA9988"
    assert y_21["delay_days"] == 0

    # Find FY 2022-2023
    y_22 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2022-2023")
    assert y_22["filing_status"] == "OVERDUE"
    assert y_22["due_date"] == "2023-12-31" # 2023-12-10 + 21 days
    assert y_22["delay_days"] > 0
    assert y_22["statutory_late_fee"] > 0

    # 4. Create Multi-year Annual Return Work Order
    create_work_resp = client.post(f"/api/annual-returns/create-work/{client_id}", json={
        "financial_years": ["2022-2023", "2023-2024"],
        "assigned_to": "Audit Staff",
        "professional_fee": 15000.0,
        "notes": "Annual return filing for pending years"
    })
    assert create_work_resp.status_code == 200
    work_info = create_work_resp.json()
    assert work_info["service_id"] == "annual-return"
    work_id = work_info["work_id"]

    # Verify Checklist items
    chk_resp = client.get(f"/api/works/{work_id}/checklist")
    assert chk_resp.status_code == 200
    chk_items = chk_resp.json()
    assert len(chk_items) >= 5
    codes = [i["item_code"] for i in chk_items]
    assert "AR-CHK-01" in codes

def test_share_transfer_reconciliation_and_authorized_apply():
    # 1. Create Client with Shareholders
    c_resp = client.post("/api/clients", json={
        "legal_name": "Acceptance Share Conveyance Corp",
        "entity_type": "PRIVATE_COMPANY"
    })
    assert c_resp.status_code == 200
    client_id = c_resp.json()["id"]

    # Add 2 Shareholders: Rahim (700 shares) and Karim (300 shares) = Total 1000 shares
    client.post(f"/api/clients/{client_id}/shareholders", json={
        "shareholder_name": "Rahim Ahmed",
        "share_count": 700,
        "share_value": 100
    })
    client.post(f"/api/clients/{client_id}/shareholders", json={
        "shareholder_name": "Karim Ullah",
        "share_count": 300,
        "share_value": 100
    })

    # Create Work for Share Transfer
    w_resp = client.post("/api/works", json={
        "work_code": "ignored",
        "client_id": client_id,
        "service_id": "share-transfer",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING"
    })
    assert w_resp.status_code == 200
    work_id = w_resp.json()["id"]

    # 2. Test Invalid Transfer (More shares than held)
    bad_resp = client.post(f"/api/share-transfers/work/{work_id}", json={
        "transferor_name": "Rahim Ahmed",
        "transferee_name": "Zahirul Islam",
        "share_count": 800, # Rahim only has 700!
        "consideration_amount": 80000
    })
    assert bad_resp.status_code == 400
    assert "insufficient" in bad_resp.json()["detail"].lower()

    # 3. Test Valid Transfer Proposal: Rahim transfers 200 shares to Zahirul Islam
    prop_resp = client.post(f"/api/share-transfers/work/{work_id}", json={
        "transferor_name": "Rahim Ahmed",
        "transferee_name": "Zahirul Islam",
        "share_count": 200,
        "nominal_value": 100,
        "paid_up_per_share": 100,
        "consideration_amount": 20000,
        "execution_date": "2024-05-10",
        "board_approval_date": "2024-05-15",
        "transfer_no": "1"
    })
    assert prop_resp.status_code == 200
    prop_data = prop_resp.json()
    assert prop_data["total_shares_reconciled"] == 1000.0

    # Verify that Master Register has NOT been altered yet
    hist_resp = client.get(f"/api/clients/{client_id}/history")
    shs = hist_resp.json()["shareholders"]
    rahim_sh = next(s for s in shs if s["shareholder_name"] == "Rahim Ahmed")
    assert float(rahim_sh["share_count"]) == 700 # Unchanged!

    # 4. Generate Form 117 PDF from this work
    gen_resp = client.post(f"/api/forms-lab/generate/{work_id}/FORM_117", json={})
    assert gen_resp.status_code == 200
    assert gen_resp.json()["form_code"] == "FORM_117"
    assert gen_resp.json()["page_count"] == 1

    # 5. Execute Authorized Apply
    apply_resp = client.post(f"/api/share-transfers/work/{work_id}/apply")
    assert apply_resp.status_code == 200
    apply_data = apply_resp.json()
    assert apply_data["status"] == "EXECUTED_IN_REGISTER"

    # Verify Master Register IS NOW UPDATED
    hist_resp_after = client.get(f"/api/clients/{client_id}/history")
    shs_after = hist_resp_after.json()["shareholders"]
    rahim_after = next(s for s in shs_after if s["shareholder_name"] == "Rahim Ahmed")
    assert float(rahim_after["share_count"]) == 500 # 700 - 200 = 500

    zahirul_after = next(s for s in shs_after if s["shareholder_name"] == "Zahirul Islam")
    assert float(zahirul_after["share_count"]) == 200 # New shareholder added

def test_mortgage_charge_deadline_and_forms_generation():
    # 1. Create Client
    c_resp = client.post("/api/clients", json={
        "legal_name": "Mortgage Acceptance Industries Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-554433",
        "registered_office_text": "Gulshan-2, Dhaka-1212"
    })
    assert c_resp.status_code == 200
    client_id = c_resp.json()["id"]

    # 2. Create Mortgage Creation Work
    w_resp = client.post("/api/works", json={
        "work_code": "ignored",
        "client_id": client_id,
        "service_id": "mortgage-charge",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING"
    })
    assert w_resp.status_code == 200
    work_id = w_resp.json()["id"]

    # 3. Test Sec 159 21-day Deadline Detection
    # Case A: Fresh deed within 21 days
    fresh_date = (date.today() - timedelta(days=5)).isoformat()
    save_resp = client.post(f"/api/mortgage-charges/work/{work_id}", json={
        "charge_type": "CREATION",
        "lender": "Eastern Bank PLC",
        "secured_amount": 25000000.0,
        "instrument_type": "Mortgage Deed",
        "instrument_date": fresh_date,
        "property_description": "Factory Land & Machinery at Gazipur"
    })
    assert save_resp.status_code == 200
    assert save_resp.json()["high_court_condonation_required"] == False

    # Get work charge check
    chk_resp = client.get(f"/api/mortgage-charges/work/{work_id}")
    assert chk_resp.status_code == 200
    assert chk_resp.json()["statutory_compliance"]["high_court_condonation_required"] == False

    # Case B: Expired deed (> 21 days ago)
    old_date = (date.today() - timedelta(days=35)).isoformat()
    save_old = client.post(f"/api/mortgage-charges/work/{work_id}", json={
        "charge_type": "CREATION",
        "lender": "Eastern Bank PLC",
        "secured_amount": 25000000.0,
        "instrument_date": old_date
    })
    assert save_old.status_code == 200
    assert save_old.json()["high_court_condonation_required"] == True

    chk_old = client.get(f"/api/mortgage-charges/work/{work_id}")
    assert chk_old.json()["statutory_compliance"]["high_court_condonation_required"] == True
    assert "Section 171" in chk_old.json()["statutory_compliance"]["message"]

    # 4. Generate Form XVIII (Charge Creation)
    gen_xviii = client.post(f"/api/forms-lab/generate/{work_id}/FORM_XVIII", json={})
    assert gen_xviii.status_code == 200
    assert gen_xviii.json()["form_code"] == "FORM_XVIII"
    assert gen_xviii.json()["page_count"] == 1

    # 5. Generate Form XIX (Charge Modification)
    gen_xix = client.post(f"/api/forms-lab/generate/{work_id}/FORM_XIX", json={
        "modification_date": date.today().isoformat(),
        "modification_details": "Credit limit enhanced to BDT 35,000,000"
    })
    assert gen_xix.status_code == 200
    assert gen_xix.json()["form_code"] == "FORM_XIX"
    assert gen_xix.json()["page_count"] == 2

    # 6. Generate Form XXVIII (Charge Satisfaction)
    gen_xxviii = client.post(f"/api/forms-lab/generate/{work_id}/FORM_XXVIII", json={
        "satisfaction_date": date.today().isoformat()
    })
    assert gen_xxviii.status_code == 200
    assert gen_xxviii.json()["form_code"] == "FORM_XXVIII"
    assert gen_xxviii.json()["page_count"] == 1

    # 7. Apply to Master
    app_resp = client.post(f"/api/mortgage-charges/work/{work_id}/apply")
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "ACTIVE"
