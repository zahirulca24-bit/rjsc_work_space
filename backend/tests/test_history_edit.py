"""Regression: editing an AGM must update the same row and clear a former AGM date."""
import uuid

from app.api.routes.history import create_or_update
from app.models.client import Client, EntityType
from app.models.corporate_history import AgmHistory


def test_update_agm_not_held_clears_old_date(db_session):
    from datetime import date

    client = Client(
        legal_name="History edit test company",
        entity_type=EntityType.PRIVATE_COMPANY,
        client_code="RJSC-HISTORY-EDIT",
        status="ACTIVE"
    )
    db_session.add(client)
    db_session.commit()
    db_session.refresh(client)

    created = create_or_update(
        AgmHistory, client.id, db_session,
        {"financial_year": "2022", "agm_date": date(2022, 12, 31), "status": "HELD"}
    )
    updated = create_or_update(
        AgmHistory, client.id, db_session,
        {"status": "NOT_HELD", "agm_date": None}, created.id
    )
    assert updated.id == created.id
    assert updated.status == "NOT_HELD"
    assert updated.agm_date is None
    assert db_session.query(AgmHistory).filter_by(client_id=client.id).count() == 1
