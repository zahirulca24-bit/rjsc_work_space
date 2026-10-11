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
