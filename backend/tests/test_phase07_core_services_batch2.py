import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import RoleEnum
from app.models.document import Document
from app.models.work import WorkChecklist
from app.api.deps import get_current_user

client = TestClient(app)

class JuniorUser:
    def __init__(self):
        self.id = uuid.UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
        self.role = RoleEnum.JUNIOR
        self.is_active = True
        self.email = "junior@example.com"
        self.name = "Test Junior"

class AdminUser:
    def __init__(self):
        self.id = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        self.role = RoleEnum.ADMIN
        self.is_active = True
        self.email = "admin@example.com"
        self.name = "Test Admin"

def test_annual_return_assessment_and_work_creation(db_session):
    # 1. Create Client
    c_resp = client.post("/api/clients", json={
        "legal_name": "Acceptance Testing Annual Return Ltd",
        "entity_type": "PRIVATE_COMPANY",
        "registration_no": "C-998877",
        "incorporation_date": "2020-01-15T00:00:00"
    })
    assert c_resp.status_code == 200
    client_id = c_resp.json()["id"]

    # Create unverified (PENDING) and verified (VERIFIED) Document records for client
    pending_doc = Document(
        client_id=uuid.UUID(client_id),
        document_name="Draft RJSC Filing Receipt.pdf",
        category="FILING_RECEIPT",
        status="PENDING"
    )
    db_session.add(pending_doc)

    verified_doc = Document(
        client_id=uuid.UUID(client_id),
        document_name="Verified RJSC Acknowledgement.pdf",
        category="RJSC_ACKNOWLEDGEMENT",
        status="VERIFIED"
    )
    db_session.add(verified_doc)
    db_session.commit()

    # 2. Add AGM history & Annual return history
    # FY 2021-2022: FILED with reviewed official acknowledgment reference
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

    # FY 2020-2021: FILED date present BUT lacks acknowledgement reference and source evidence!
    # Audit Rule: Do not mark filing evidence VERIFIED merely because a filing date is populated.
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2020-2021",
        "agm_date": "2021-12-10",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2020-2021",
        "actual_agm_date": "2021-12-10",
        "filed_date": "2021-12-25"
        # No acknowledgement_reference or source_evidence provided!
    })

    # FY 2019-2020: NEGATIVE EVIDENCE TEST: Arbitrary text in source_evidence must NOT bypass gate!
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2019-2020",
        "agm_date": "2020-12-10",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2019-2020",
        "actual_agm_date": "2020-12-10",
        "filed_date": "2020-12-28",
        "source_evidence": "Arbitrary typed receipt note in office file" # Arbitrary string alone
    })

    # FY 2018-2019: NEGATIVE EVIDENCE TEST: Unverified Document (PENDING status) must NOT bypass gate!
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2018-2019",
        "agm_date": "2019-12-10",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2018-2019",
        "actual_agm_date": "2019-12-10",
        "filed_date": "2019-12-28",
        "source_evidence": str(pending_doc.id) # Referenced document has status == "PENDING"
    })

    # FY 2017-2018: POSITIVE PROVENANCE TEST: Explicitly VERIFIED Document marks evidence VERIFIED
    client.post(f"/api/clients/{client_id}/agm-history", json={
        "financial_year": "2017-2018",
        "agm_date": "2018-12-10",
        "status": "HELD"
    })
    client.post(f"/api/clients/{client_id}/annual-returns", json={
        "financial_year": "2017-2018",
        "actual_agm_date": "2018-12-10",
        "filed_date": "2018-12-28",
        "source_evidence": str(verified_doc.id) # Referenced document has status == "VERIFIED"
    })

    # FY 2022-2023: OVERDUE (AGM held in Dec 2023, not filed)
    # Audit Rule: Remove unapproved hardcoded late fees; return REVIEW_REQUIRED
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
    assert ass_data["filed_count"] >= 5
    assert ass_data["overdue_count"] >= 1

    # Verify FY 2021-2022 (Verified with Reviewed Official Acknowledgment Prefix)
    y_21 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2021-2022")
    assert y_21["filing_status"] == "FILED"
    assert y_21["evidence_status"] == "VERIFIED"
    assert y_21["dvc_code"] == "221120CA9988"
    assert y_21["delay_days"] == 0
    assert y_21["statutory_late_fee"] == 0.0

    # Verify FY 2020-2021 (Unevidenced Filing Date -> REVIEW_REQUIRED)
    y_20 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2020-2021")
    assert y_20["filing_status"] == "FILED"
    assert y_20["evidence_status"] == "REVIEW_REQUIRED"

    # Verify FY 2019-2020 (Arbitrary Text Alone in source_evidence -> REVIEW_REQUIRED)
    y_19 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2019-2020")
    assert y_19["filing_status"] == "FILED"
    assert y_19["evidence_status"] == "REVIEW_REQUIRED"

    # Verify FY 2018-2019 (Unverified Document PENDING in source_evidence -> REVIEW_REQUIRED)
    y_18 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2018-2019")
    assert y_18["filing_status"] == "FILED"
    assert y_18["evidence_status"] == "REVIEW_REQUIRED"

    # Verify FY 2017-2018 (Verified Document in source_evidence -> VERIFIED)
    y_17 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2017-2018")
    assert y_17["filing_status"] == "FILED"
    assert y_17["evidence_status"] == "VERIFIED"

    # Verify FY 2022-2023 (Overdue -> statutory_late_fee == "REVIEW_REQUIRED")
    y_22 = next(y for y in ass_data["assessment"] if y["financial_year"] == "2022-2023")
    assert y_22["filing_status"] == "OVERDUE"
    assert y_22["due_date"] == "2023-12-31" # 2023-12-10 + 21 days
    assert y_22["delay_days"] > 0
    assert y_22["statutory_late_fee"] == "REVIEW_REQUIRED"

    # Verify an unevidenced future year: actual AGM date must NOT be inferred from FY string
    y_curr = next(y for y in ass_data["assessment"] if y["financial_year"] == "2023-2024")
    assert y_curr["actual_agm_date"] is None
    assert y_curr["due_date"] is None
    assert y_curr["filing_status"] == "EVIDENCE_UNCERTAIN"

    # Verify bundled forms in assessment
    assert y_22["bundled_forms"] == ["SCHEDULE_X", "BALANCE_SHEET", "PROFIT_LOSS", "FORM_23B"]
    assert "FORM_XII" not in y_22["bundled_forms"]

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

    # Verify Checklist items (statutory annual return bundle)
    chk_resp = client.get(f"/api/works/{work_id}/checklist")
    assert chk_resp.status_code == 200
    chk_items = chk_resp.json()
    assert len(chk_items) >= 5
    codes = [i["item_code"] for i in chk_items]
    texts = [i["item_text"] for i in chk_items]
    assert "AR-CHK-01" in codes
    # Verify Form XII is NOT routinely required in Annual Return checklist
    assert not any("Form XII" in t for t in texts)
    assert any("Schedule X" in t for t in texts)
    assert any("Audited Balance Sheet" in t for t in texts)
    assert any("Profit & Loss Account" in t for t in texts)
    assert any("Form 23B" in t for t in texts)

def test_share_transfer_reconciliation_and_authorized_apply(db_session):
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

    # 3. Test Valid Transfer Proposal: Rahim transfers 200 shares to Zahirul Islam (saved as DRAFT)
    # Save proposal initially without board approval date
    prop_resp_nodate = client.post(f"/api/share-transfers/work/{work_id}", json={
        "transferor_name": "Rahim Ahmed",
        "transferee_name": "Zahirul Islam",
        "share_count": 200,
        "nominal_value": 100,
        "paid_up_per_share": 100,
        "consideration_amount": 20000,
        "execution_date": "2024-05-10",
        "transfer_no": "1"
    })
    assert prop_resp_nodate.status_code == 200
    prop_data = prop_resp_nodate.json()
    assert prop_data["status"] == "DRAFT"
    assert prop_data["total_shares_reconciled"] == 1000.0

    # 4. NEGATIVE APPROVAL TEST: Missing Board Approval Date is strictly rejected with 400
    app.dependency_overrides[get_current_user] = lambda: AdminUser()
    appr_nodate = client.post(f"/api/share-transfers/work/{work_id}/approve", json={})
    assert appr_nodate.status_code == 400
    assert "board approval meeting date is required" in appr_nodate.json()["detail"].lower()

    # 5. NEGATIVE PERMISSION TEST: Unauthorized staff (JUNIOR) attempting apply is rejected with 403
    app.dependency_overrides[get_current_user] = lambda: JuniorUser()
    apply_junior = client.post(f"/api/share-transfers/work/{work_id}/apply")
    assert apply_junior.status_code == 403
    assert "unauthorized" in apply_junior.json()["detail"].lower()

    # 6. NEGATIVE STATUS TEST: Authorized staff (ADMIN) attempting apply while status is DRAFT is rejected with 400
    app.dependency_overrides[get_current_user] = lambda: AdminUser()
    apply_draft = client.post(f"/api/share-transfers/work/{work_id}/apply")
    assert apply_draft.status_code == 400
    assert "approved" in apply_draft.json()["detail"].lower()

    # 7. NEGATIVE APPROVAL TEST: Unauthorized staff (JUNIOR) attempting approve is rejected with 403
    app.dependency_overrides[get_current_user] = lambda: JuniorUser()
    appr_junior = client.post(f"/api/share-transfers/work/{work_id}/approve", json={
        "board_approval_date": "2024-05-15"
    })
    assert appr_junior.status_code == 403

    # 8. NEGATIVE EVIDENCE TEST: Arbitrary typed string alone cannot authorize execution
    app.dependency_overrides[get_current_user] = lambda: AdminUser()
    appr_typed_string = client.post(f"/api/share-transfers/work/{work_id}/approve", json={
        "board_approval_date": "2024-05-15",
        "board_resolution_evidence": "Arbitrary typed meeting minutes in minute book"
    })
    assert appr_typed_string.status_code == 400
    assert "typed evidence string alone does not authorize execution" in appr_typed_string.json()["detail"].lower()

    # 9. NEGATIVE EVIDENCE TEST: Unverified Board Resolution document (status == PENDING) cannot authorize execution
    pending_board_doc = Document(
        client_id=uuid.UUID(client_id),
        work_id=uuid.UUID(work_id),
        document_name="Draft Board Resolution.pdf",
        category="BOARD_RESOLUTION",
        status="PENDING"
    )
    db_session.add(pending_board_doc)
    db_session.commit()

    appr_unverified_doc = client.post(f"/api/share-transfers/work/{work_id}/approve", json={
        "board_approval_date": "2024-05-15",
        "document_id": str(pending_board_doc.id)
    })
    assert appr_unverified_doc.status_code == 400
    assert "referenced board resolution document status is 'pending'" in appr_unverified_doc.json()["detail"].lower()

    # 10. AUTHORIZED APPROVAL: Now provide verified Board Resolution document (status == VERIFIED)
    verified_board_doc = Document(
        client_id=uuid.UUID(client_id),
        work_id=uuid.UUID(work_id),
        document_name="Signed Board Resolution.pdf",
        category="BOARD_RESOLUTION",
        status="VERIFIED"
    )
    db_session.add(verified_board_doc)
    db_session.commit()

    appr_admin = client.post(f"/api/share-transfers/work/{work_id}/approve", json={
        "board_approval_date": "2024-05-15",
        "document_id": str(verified_board_doc.id)
    })
    assert appr_admin.status_code == 200
    assert appr_admin.json()["status"] == "APPROVED"

    # 11. Generate Form 117 PDF from this work
    gen_resp = client.post(f"/api/forms-lab/generate/{work_id}/FORM_117", json={})
    assert gen_resp.status_code == 200
    assert gen_resp.json()["form_code"] == "FORM_117"
    assert gen_resp.json()["page_count"] == 1

    # 12. Execute Authorized Apply
    apply_resp = client.post(f"/api/share-transfers/work/{work_id}/apply")
    assert apply_resp.status_code == 200
    apply_data = apply_resp.json()
    assert apply_data["status"] == "EXECUTED_IN_REGISTER"

    # 13. Verify Master Register IS NOW UPDATED
    hist_resp_after = client.get(f"/api/clients/{client_id}/history")
    shs_after = hist_resp_after.json()["shareholders"]
    rahim_after = next(s for s in shs_after if s["shareholder_name"] == "Rahim Ahmed")
    assert float(rahim_after["share_count"]) == 500 # 700 - 200 = 500

    zahirul_after = next(s for s in shs_after if s["shareholder_name"] == "Zahirul Islam")
    assert float(zahirul_after["share_count"]) == 200 # New shareholder added

    # 14. Re-execution of already executed transfer is rejected with 400
    apply_reexec = client.post(f"/api/share-transfers/work/{work_id}/apply")
    assert apply_reexec.status_code == 400

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

    # 7. NEGATIVE TEST: Attempting to apply without registration date is rejected (No defaulting to today)
    app_no_date = client.post(f"/api/mortgage-charges/work/{work_id}/apply")
    assert app_no_date.status_code == 400
    assert "actual rjsc registration date is missing" in app_no_date.json()["detail"].lower()

    # 8. NEGATIVE TEST: Attempting to apply without source-backed filing evidence is rejected
    client.post(f"/api/mortgage-charges/work/{work_id}", json={
        "charge_type": "CREATION",
        "lender": "Eastern Bank PLC",
        "secured_amount": 25000000.0,
        "instrument_date": fresh_date,
        "registration_date": "2024-06-15"
        # No filing_reference!
    })
    app_no_ref = client.post(f"/api/mortgage-charges/work/{work_id}/apply")
    assert app_no_ref.status_code == 400
    assert "source-backed registration evidence" in app_no_ref.json()["detail"].lower()

    # 9. NEGATIVE PERMISSION TEST: Unauthorized staff (JUNIOR) attempting apply is rejected with 403
    client.post(f"/api/mortgage-charges/work/{work_id}", json={
        "charge_type": "CREATION",
        "lender": "Eastern Bank PLC",
        "secured_amount": 25000000.0,
        "instrument_date": fresh_date,
        "registration_date": "2024-06-15",
        "filing_reference": "RJSC-CHG-2024-8899"
    })
    app.dependency_overrides[get_current_user] = lambda: JuniorUser()
    app_junior = client.post(f"/api/mortgage-charges/work/{work_id}/apply")
    assert app_junior.status_code == 403

    # 10. AUTHORIZED APPLY: With verified date and filing evidence committed by ADMIN
    app.dependency_overrides[get_current_user] = lambda: AdminUser()
    app_resp = client.post(f"/api/mortgage-charges/work/{work_id}/apply")
    assert app_resp.status_code == 200
    assert app_resp.json()["status"] == "ACTIVE"
    assert app_resp.json()["registration_date"] == "2024-06-15" # Preserves verified date, not today!

    # 11. SATISFACTION NEGATIVE TEST: Satisfaction without NOC ref or filing ref is rejected
    w2_resp = client.post("/api/works", json={
        "work_code": "ignored",
        "client_id": client_id,
        "service_id": "mortgage-charge",
        "entity_type": "PRIVATE_COMPANY",
        "status": "PENDING"
    })
    w2_id = w2_resp.json()["id"]
    client.post(f"/api/mortgage-charges/work/{w2_id}", json={
        "charge_type": "SATISFACTION",
        "lender": "Eastern Bank PLC",
        "secured_amount": 25000000.0,
        "satisfaction_date": "2024-09-01"
        # Missing satisfaction_noc_ref and filing_reference!
    })
    sat_bad = client.post(f"/api/mortgage-charges/work/{w2_id}/apply")
    assert sat_bad.status_code == 400
    assert "source-backed evidence" in sat_bad.json()["detail"].lower()
