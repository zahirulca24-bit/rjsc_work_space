"""Regression: reviewed RJSC Schedule X list supports only explicit financial years."""
import uuid
from datetime import date

from app.api.deps import get_current_user
from app.main import app
from app.models.client import Client
from app.models.document import Document
from app.models.user import RoleEnum


class Reviewer:
    id = uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    role = RoleEnum.ADMIN
    is_active = True
    email = "verified-reviewer@example.com"
    name = "Verified Reviewer"


def test_rjsc_schedule_x_review_updates_only_explicit_evidenced_year(client, db_session):
    previous = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: Reviewer()
    try:
        c = Client(
            legal_name="RJSC Screenshot Test " + uuid.uuid4().hex[:8],
            client_code="RJSC-" + uuid.uuid4().hex[:7],
            entity_type="PRIVATE_COMPANY",
            registration_no="C-" + uuid.uuid4().hex[:8],
            incorporation_date=date(2014, 1, 1),
        )
        db_session.add(c)
        db_session.flush()
        schedule_doc = Document(
            client_id=c.id,
            document_name="RJSC online Schedule X list.png",
            category="SCHEDULE_X",
            mime_type="image/png",
            file_hash="testsha256-" + uuid.uuid4().hex,
            storage_reference="tests/evidence-" + uuid.uuid4().hex + ".png",
            storage_provider="local",
            status="VERIFIED",
        )
        db_session.add(schedule_doc)
        db_session.commit()

        payload = {
            "schedule_x_document_id": str(schedule_doc.id),
            "schedule_x_document_date": "2022-01-01",
            "verified_financial_years": ["2018-2019", "2019-2020"],
        }
        endpoint = f"/api/annual-returns/verify-rjsc-online-record/{c.id}"
        response = client.post(endpoint, json=payload)
        assert response.status_code == 200, response.text
        assert response.json()["verified_financial_years"] == ["2018-2019", "2019-2020"]

        assessment = client.get(f"/api/annual-returns/assessment/{c.id}")
        assert assessment.status_code == 200, assessment.text
        years = {row["financial_year"]: row for row in assessment.json()["assessment"]}
        for fy in payload["verified_financial_years"]:
            assert years[fy]["filing_status"] == "FILED"
            assert years[fy]["evidence_status"] == "VERIFIED"
            assert years[fy]["filed_date"] is None  # Not the document date.
            assert years[fy]["actual_agm_date"] is None
        assert years["2020-2021"]["filing_status"] == "EVIDENCE_UNCERTAIN"

        # Idempotent verification: same document/period does not create duplicate rows.
        response = client.post(endpoint, json=payload)
        assert response.status_code == 200, response.text

        # A document dated January 2022 cannot evidence FY ending June 2022.
        response = client.post(endpoint, json={**payload, "verified_financial_years": ["2021-2022"]})
        assert response.status_code == 400

        # Can't create another work for a period already verified by RJSC evidence.
        response = client.post(
            f"/api/annual-returns/create-work/{c.id}",
            json={"financial_years": ["2019-2020"]},
        )
        assert response.status_code == 409

        schedule_doc.status = "PENDING"
        db_session.commit()
        response = client.post(endpoint, json=payload)
        assert response.status_code == 400
    finally:
        if previous is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous
