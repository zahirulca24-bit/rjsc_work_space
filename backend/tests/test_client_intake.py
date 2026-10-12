from app.api.routes.client_intake import extract_client_fields

def test_form_xii_extracts_name_and_registration_without_assuming_incorporation():
    text = (
        "Form XII\n"
        "Issue No: 12345 Date: 12.08.2021\n"
        "Name of the Company: SILVEE AND SINTHEE TRAVEL AGENCY LTD., Reg. No. C-118168, Reg. Date: 14-SEP-14\n"
        "Name of directors\n"
    )
    result = extract_client_fields(text)
    assert result["legal_name"] == "SILVEE AND SINTHEE TRAVEL AGENCY LTD"
    assert result["registration_no"] == "C-118168"
    assert "incorporation_date" not in result

def test_explicit_incorporation_date_only():
    text = "Company Name: Example Private Limited\nRegistration No: C-123456\nDate of Incorporation: 14.09.2014\n"
    result = extract_client_fields(text)
    assert result["incorporation_date"] == "2014-09-14"
    assert result["registration_no"] == "C-123456"

def test_invalid_or_unknown_dates_are_not_invented():
    result = extract_client_fields("Company Name: Example Ltd\nDate of Incorporation: 99.99.2014")
    assert "incorporation_date" not in result

def test_enhanced_fields_extraction_from_schedule_x_and_form_xii():
    text = (
        "Certificate of Incorporation\n"
        "Company Name: BANGLADESH LOGISTICS PRIVATE LIMITED\n"
        "Registration No: C-987654\n"
        "Date of Incorporation: 14-SEP-2014\n"
        "Registered Office: Motijheel C/A, Dhaka-1000\n"
        "Authorized Capital: Tk. 10,000,000\n"
        "Paid-up Capital: Tk. 5,000,000\n"
        "Issue Date: 15.09.2014\n"
        "Issue No: RJSC-ISSUE-992\n"
        "Director: Md Zahirul Islam\n"
        "Director: Mrs Fatema Begum\n"
    )
    res = extract_client_fields(text)
    assert res["legal_name"] == "BANGLADESH LOGISTICS PRIVATE LIMITED"
    assert res["registration_no"] == "C-987654"
    assert res["incorporation_date"] == "2014-09-14"
    assert res["entity_type"] == "PRIVATE_COMPANY"
    assert "Motijheel C/A, Dhaka-1000" in res["registered_office"]
    assert res["authorized_capital"] == 10000000.0
    assert res["paid_up_capital"] == 5000000.0
    assert res["document_date"] == "2014-09-15"
    assert res["source_reference"] == "RJSC-ISSUE-992"
    assert len(res["directors"]) == 2
    assert res["directors"][0]["full_name"] == "Md Zahirul Islam"

