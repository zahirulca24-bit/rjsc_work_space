import io
from uuid import UUID

import pytest

from app.models.ai import DocumentAIAnalysis
from app.models.work import WorkChecklist
from app.services.document_extraction import (
    extract_document_text,
)
from app.services.groq_ai import (
    _normalize_result,
)


def create_client(client):
    response = client.post(
        "/api/clients",
        json={
            "legal_name": "AI Test Client",
            "entity_type": "PRIVATE_COMPANY",
        },
    )

    assert response.status_code == 200
    return response.json()["id"]


def create_work(client, client_id):
    response = client.post(
        "/api/works",
        json={
            "client_id": client_id,
            "service_id": "TEST_AI",
            "entity_type": "PRIVATE_COMPANY",
            "status": "PENDING",
        },
    )

    assert response.status_code == 200
    return response.json()["id"]


def upload_csv(
    client,
    *,
    work_id=None,
    content=None,
):
    if content is None:
        from uuid import uuid4
        content = (
            "Name,Value\n"
            f"Company,ABC Ltd {uuid4()}\n"
        ).encode("utf-8")

    files = {
        "file": (
            "document.csv",
            io.BytesIO(content),
            "text/csv",
        )
    }

    data = {
        "category": "OTHER",
    }

    if work_id:
        data["work_id"] = work_id

    response = client.post(
        "/api/documents/upload",
        files=files,
        data=data,
    )

    assert response.status_code == 200
    return response.json()


def test_csv_text_extraction():
    data = (
        b"Company,ABC Limited\n"
        b"Registration,C-12345\n"
    )

    text = extract_document_text(
        data,
        "test.csv",
        30000,
    )

    assert "ABC Limited" in text
    assert "C-12345" in text


def test_ai_normalization_rejects_unknown_category():
    result = _normalize_result({
        "suggested_category": "MADE_UP_FORM",
        "confidence": 0.99,
        "extracted_metadata": {},
        "checklist_matches": [],
        "needs_source_review": False,
    })

    assert result["suggested_category"] == "OTHER"
    assert result["needs_source_review"] is True


def test_ai_normalization_clamps_confidence():
    result = _normalize_result({
        "suggested_category": "FORM_XII",
        "confidence": 9,
        "extracted_metadata": {},
        "checklist_matches": [],
        "needs_source_review": False,
    })

    assert result["confidence"] == 1.0


def test_low_confidence_requires_review():
    result = _normalize_result({
        "suggested_category": "FORM_VI",
        "confidence": 0.40,
        "extracted_metadata": {},
        "checklist_matches": [],
        "needs_source_review": False,
    })

    assert result["needs_source_review"] is True


def test_ai_status_endpoint(client):
    response = client.get(
        "/api/documents/ai/status"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["provider"] == "groq"
    assert data["human_approval_required"] is True
    assert data["legal_inference_enabled"] is False


def test_analysis_requires_configuration(
    client,
    monkeypatch,
):
    import app.api.routes.ai_documents as routes

    document = upload_csv(client)

    monkeypatch.setattr(
        routes,
        "is_configured",
        lambda: False,
    )

    response = client.post(
        f"/api/documents/{document['id']}/ai-analyze"
    )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"]


def test_ai_analyze_saves_suggestion_only(
    client,
    db_session,
    monkeypatch,
):
    import app.api.routes.ai_documents as routes

    client_id = create_client(client)
    work_id = create_work(
        client,
        client_id,
    )

    checklist = WorkChecklist(
        work_id=UUID(work_id),
        item_code="FORM_XII",
        item_text="Form XII",
        status="PENDING",
        sort_order=1,
    )

    db_session.add(checklist)
    db_session.commit()
    db_session.refresh(checklist)

    document = upload_csv(
        client,
        work_id=work_id,
    )

    monkeypatch.setattr(
        routes,
        "is_configured",
        lambda: True,
    )

    async def fake_analyze_text_document(
        *,
        filename,
        text,
        checklist,
    ):
        return {
            "suggested_category": "FORM_XII",
            "confidence": 0.92,
            "extracted_metadata": {
                "company_name": "ABC Ltd",
            },
            "checklist_matches": [
                {
                    "item_id": str(
                        checklist[0]["item_id"]
                    ),
                    "reason": "Form XII detected",
                }
            ],
            "needs_source_review": False,
            "model": "test-model",
        }

    monkeypatch.setattr(
        routes,
        "analyze_text_document",
        fake_analyze_text_document,
    )

    response = client.post(
        f"/api/documents/{document['id']}/ai-analyze"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["suggested_category"]
        == "FORM_XII"
    )
    assert data["approved"] is False

    fresh = client.get(
        f"/api/documents/{document['id']}"
    ).json()

    # Human approval is mandatory.
    assert fresh["category"] == "OTHER"

    db_session.expire_all()

    item = (
        db_session.query(WorkChecklist)
        .filter(
            WorkChecklist.id
            == checklist.id
        )
        .first()
    )

    # AI never auto-completes checklist.
    assert item.status == "PENDING"


def test_manager_approval_applies_category(
    client,
    db_session,
):
    document = upload_csv(client)

    analysis = DocumentAIAnalysis(
        document_id=UUID(
            document["id"]
        ),
        provider="groq",
        model="test-model",
        status="COMPLETED",
        extracted_text="Form VI",
        suggested_category="FORM_VI",
        confidence=0.95,
        extracted_metadata={},
        checklist_matches=[],
        missing_checklist_items=[],
        needs_source_review=False,
    )

    db_session.add(analysis)
    db_session.commit()
    db_session.refresh(analysis)

    response = client.post(
        (
            f"/api/documents/{document['id']}"
            f"/ai-analysis/{analysis.id}/approve"
        ),
        json={
            "apply_category": True,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "approved"
    assert data["category"] == "FORM_VI"
    assert (
        data["checklist_auto_updated"]
        is False
    )


def test_latest_analysis_endpoint(
    client,
    db_session,
):
    document = upload_csv(client)

    analysis = DocumentAIAnalysis(
        document_id=UUID(
            document["id"]
        ),
        provider="groq",
        model="test-model",
        status="COMPLETED",
        suggested_category="OTHER",
        confidence=0.5,
        extracted_metadata={},
        checklist_matches=[],
        missing_checklist_items=[],
        needs_source_review=True,
    )

    db_session.add(analysis)
    db_session.commit()

    response = client.get(
        f"/api/documents/{document['id']}/ai-analysis"
    )

    assert response.status_code == 200
    assert (
        response.json()["suggested_category"]
        == "OTHER"
    )
