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
        assert db_session.query(RjscSnapshot).filter_by(client_id=client.id).count() == 2
