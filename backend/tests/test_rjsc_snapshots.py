from datetime import date

from fastapi.testclient import TestClient

from app.main import app
from app.models.client import Client, EntityType
from app.models.rjsc_snapshot import RjscSnapshot


def test_rjsc_snapshot_is_append_only_and_verification_explicit(db_session):
    client = Client(
        client_code="RJSC-SNAPSHOT-TEST",
        legal_name="Snapshot Test Company",
        entity_type=EntityType.PRIVATE_COMPANY,
        status="ACTIVE",
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    url = f"/api/rjsc-snapshots/{client.id}"

    with TestClient(app) as api:
        first = api.post(url, json={
            "source_reference": "RJSC Extract Ref-001",
            "checked_on": str(date.today()),
            "is_verified": False,
            "fields": {"registration_no": "C-12345"}
        })
        assert first.status_code == 201, first.text
        second = api.post(url, json={
            "source_reference": "RJSC Certified Copy Ref-002",
            "checked_on": str(date.today()),
            "is_verified": True,
            "fields": {"registration_no": "C-12345"}
        })
        assert second.status_code == 201, second.text
        rows = api.get(url)
        assert rows.status_code == 200, rows.text
        entries = rows.json()
        assert len(entries) == 2
        assert entries[0]["is_verified"] is True
        assert entries[1]["is_verified"] is False
        assert entries[0]["source_reference"] == "RJSC Certified Copy Ref-002"
        invalid = api.post(url, json={
            "source_reference": "",
            "checked_on": str(date.today()),
            "is_verified": True,
            "fields": {"registration_no": "C-12345"}
        })
        assert invalid.status_code == 422
        oversized = api.post(url, json={
            "source_reference": "RJSC Ref-003",
            "checked_on": str(date.today()),
            "fields": {"registered_office": "A" * 1001}
        })
        assert oversized.status_code == 422
        empty_fields = api.post(url, json={
            "source_reference": "RJSC Ref-004",
            "checked_on": str(date.today()),
            "fields": {"registration_no": " "}
        })
        assert empty_fields.status_code == 422
        assert db_session.query(RjscSnapshot).filter_by(client_id=client.id).count() == 2


def test_validation_exception_handler_returns_safe_json_422(db_session):
    client = Client(
        client_code="RJSC-VAL-TEST",
        legal_name="Validation Test Company",
        entity_type=EntityType.PRIVATE_COMPANY,
        status="ACTIVE",
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)
    url = f"/api/rjsc-snapshots/{client.id}"

    with TestClient(app) as api:
        # Invalid payload triggering custom Pydantic model validator ValueError
        res = api.post(url, json={
            "source_reference": "",
            "checked_on": str(date.today()),
            "is_verified": True,
            "fields": {"registration_no": "C-12345"}
        })
        # 1. Invalid payload returns HTTP 422
        assert res.status_code == 422
        # 2. Response is valid JSON
        data = res.json()
        assert isinstance(data, dict)
        assert "detail" in data
        assert isinstance(data["detail"], list)
        assert len(data["detail"]) > 0
        assert "request_id" in data
        # 3. No internal traceback leaks to the client
        assert "traceback" not in res.text.lower()
        assert "traceback (most recent call last)" not in res.text.lower()
        assert "internal server error" not in res.text.lower()

        # 4. Valid requests continue working
        valid_res = api.post(url, json={
            "source_reference": "Verified RJSC Ref-Val-001",
            "checked_on": str(date.today()),
            "is_verified": False,
            "fields": {"registration_no": "C-99999"}
        })
        assert valid_res.status_code == 201
        assert valid_res.json().get("status") == "saved"

