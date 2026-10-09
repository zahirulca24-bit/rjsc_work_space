import pytest
from app.main import app
from app.api.deps import get_current_user
from app.models.user import User, RoleEnum
import uuid

@pytest.fixture(autouse=True)
def clear_overrides():
    old = app.dependency_overrides.pop(get_current_user, None)
    yield
    if old:
        app.dependency_overrides[get_current_user] = old

def _get_client(client, role):
    user = User(
        id=uuid.uuid4(),
        name=f"{role.value} user",
        email=f"{role.value.lower()}@example.com",
        role=role.value,
        is_active=True
    )
    app.dependency_overrides[get_current_user] = lambda: user
    return client, user

def test_review_workflow_full(client, db_session):
    c_admin, _ = _get_client(client, RoleEnum.ADMIN)
    res = c_admin.post("/api/clients", json={"legal_name": "Client", "entity_type": "PRIVATE_COMPANY", "registration_no": "C-123"})
    client_id = res.json()["id"]
    
    c_junior, _ = _get_client(client, RoleEnum.JUNIOR)
    res = c_junior.post("/api/works", json={
        "client_id": client_id, "service_id": "test", "entity_type": "PRIVATE_COMPANY",
        "professional_fee": 100, "status": "IN_PROGRESS"
    })
    work_id = res.json()["id"]

    _get_client(client, RoleEnum.ADMIN)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "SUBMIT_TO_SENIOR"}).status_code == 403
    _get_client(client, RoleEnum.MANAGER)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "SUBMIT_TO_SENIOR"}).status_code == 403

    _get_client(client, RoleEnum.JUNIOR)
    res = client.post(f"/api/works/{work_id}/review-actions", json={"action": "SUBMIT_TO_SENIOR"})
    assert res.status_code == 200
    assert res.json()["new_status"] == "SUBMITTED_TO_SENIOR"

    _get_client(client, RoleEnum.JUNIOR)
    assert client.patch(f"/api/works/{work_id}", json={"notes": "edit"}).status_code == 403

    _get_client(client, RoleEnum.ADMIN)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "APPROVE_BY_SENIOR"}).status_code == 403
    
    _get_client(client, RoleEnum.MANAGER)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "RETURN_BY_SENIOR", "comment": "x"}).status_code == 403

    _get_client(client, RoleEnum.SENIOR)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "RETURN_BY_SENIOR", "comment": "   "}).status_code == 422

    _get_client(client, RoleEnum.SENIOR)
    res = client.post(f"/api/works/{work_id}/review-actions", json={"action": "RETURN_BY_SENIOR", "comment": "Need changes"})
    assert res.status_code == 200

    _get_client(client, RoleEnum.JUNIOR)
    assert client.patch(f"/api/works/{work_id}", json={"notes": "fixed"}).status_code == 200

    _get_client(client, RoleEnum.JUNIOR)
    client.post(f"/api/works/{work_id}/review-actions", json={"action": "SUBMIT_TO_SENIOR"})

    _get_client(client, RoleEnum.SENIOR)
    res = client.post(f"/api/works/{work_id}/review-actions", json={"action": "APPROVE_BY_SENIOR"})
    assert res.status_code == 200

    _get_client(client, RoleEnum.MANAGER)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "RETURN_BY_MANAGER", "comment": ""}).status_code == 422

    _get_client(client, RoleEnum.MANAGER)
    res = client.post(f"/api/works/{work_id}/review-actions", json={"action": "RETURN_BY_MANAGER", "comment": "One more thing"})
    assert res.status_code == 200

    _get_client(client, RoleEnum.JUNIOR)
    client.post(f"/api/works/{work_id}/review-actions", json={"action": "SUBMIT_TO_SENIOR"})
    _get_client(client, RoleEnum.SENIOR)
    client.post(f"/api/works/{work_id}/review-actions", json={"action": "APPROVE_BY_SENIOR"})

    _get_client(client, RoleEnum.MANAGER)
    res = client.post(f"/api/works/{work_id}/review-actions", json={"action": "FINAL_APPROVE"})
    assert res.status_code == 200

    _get_client(client, RoleEnum.MANAGER)
    assert client.post(f"/api/works/{work_id}/review-actions", json={"action": "FINAL_APPROVE"}).status_code == 409

    _get_client(client, RoleEnum.MANAGER)
    res = client.get(f"/api/works/{work_id}/reviews")
    history = res.json()
    assert len(history) == 8
    assert history[-1]["action"] == "FINAL_APPROVE"
    assert history[-1]["reviewer_role"] == "MANAGER"

def test_unauthenticated(client):
    app.dependency_overrides.clear()
    res = client.post("/api/works/00000000-0000-0000-0000-000000000000/review-actions", json={"action": "SUBMIT_TO_SENIOR"})
    assert res.status_code == 401
