import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_user

@pytest.fixture(autouse=True)
def clear_overrides():
    old = app.dependency_overrides.pop(get_current_user, None)
    yield
    if old:
        app.dependency_overrides[get_current_user] = old

from app.models.user import User, RoleEnum
from app.core.security import get_password_hash
import jwt
from app.core.config import settings

def test_login_unknown_user(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "password"})
    assert response.status_code == 401

def test_login_inactive_user(client, db_session):
    user = User(
        name="Inactive",
        email="inactive@example.com",
        password_hash=get_password_hash("password"),
        role=RoleEnum.ADMIN,
        is_active=False
    )
    db_session.add(user)
    db_session.commit()
    response = client.post("/api/auth/login", json={"email": "inactive@example.com", "password": "password"})
    assert response.status_code == 401

def test_invalid_token(client):
    client.cookies.set("access_token", "invalid_token_here")
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_expired_token(client, db_session):
    import datetime
    user = User(
        name="Test",
        email="expired@example.com",
        password_hash=get_password_hash("password"),
        role=RoleEnum.ADMIN
    )
    db_session.add(user)
    db_session.commit()
    
    # Generate expired token
    payload = {
        "sub": str(user.id),
        "exp": datetime.datetime.now(datetime.UTC) - datetime.timedelta(minutes=10)
    }
    token = jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")
    client.cookies.set("access_token", token)
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_malformed_email(client):
    response = client.post("/api/auth/login", json={"email": "not-an-email", "password": "password"})
    assert response.status_code == 422
    
def test_password_hash_not_exposed(client, db_session):
    user = User(
        name="Test",
        email="expose@example.com",
        password_hash=get_password_hash("password"),
        role=RoleEnum.ADMIN
    )
    db_session.add(user)
    db_session.commit()
    
    # Bypass auth via app overrides or just generate token
    payload = {"sub": str(user.id), "exp": 9999999999}
    token = jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")
    client.cookies.set("access_token", token)
    
    response = client.get("/api/auth/me")
    data = response.json()
    assert "password_hash" not in data
    assert "password" not in data

def test_password_not_plaintext(db_session):
    user = User(
        name="Test",
        email="plain@example.com",
        password_hash=get_password_hash("mysecret"),
        role=RoleEnum.ADMIN
    )
    db_session.add(user)
    db_session.commit()
    
    db_user = db_session.query(User).filter_by(email="plain@example.com").first()
    assert db_user.password_hash != "mysecret"
    assert len(db_user.password_hash) > 20

def _get_client_for_role(client, db_session, role):
    import uuid
    email = f"{role.value.lower()}_{uuid.uuid4().hex[:6]}@example.com"
    user = User(
        name=f"{role.value} User",
        email=email,
        password_hash=get_password_hash("password"),
        role=role
    )
    db_session.add(user)
    db_session.commit()
    payload = {"sub": str(user.id), "exp": 9999999999}
    token = jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")
    client.cookies.set("access_token", token)
    return client

def test_manager_user_management(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.MANAGER)
    response = c.get("/api/users")
    assert response.status_code == 403

def test_senior_invoice_mutation(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.SENIOR)
    response = c.post("/api/invoices", json={"client_id": "00000000-0000-0000-0000-000000000000", "bill_date": "2023-01-01", "items": [{"description": "test", "amount": 100, "quantity": 1}]})
    assert response.status_code == 403

def test_junior_invoice_mutation(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.JUNIOR)
    response = c.post("/api/invoices", json={"client_id": "00000000-0000-0000-0000-000000000000", "bill_date": "2023-01-01", "items": [{"description": "test", "amount": 100, "quantity": 1}]})
    assert response.status_code == 403

def test_junior_transaction_mutation(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.JUNIOR)
    response = c.post("/api/transactions", json={"client_id": "00000000-0000-0000-0000-000000000000", "transaction_type": "COLLECTION", "amount": 100, "transaction_date": "2023-01-01"})
    assert response.status_code == 403

def test_manager_finance_mutation_allowed(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.MANAGER)
    response = c.post("/api/invoices", json={"client_id": "00000000-0000-0000-0000-000000000000", "bill_date": "2023-01-01", "items": [{"description": "test", "amount": 100, "quantity": 1}]})
    # Might fail due to foreign key or validation, but NOT 403
    assert response.status_code != 403

def test_admin_finance_mutation_allowed(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.ADMIN)
    response = c.post("/api/transactions", json={"client_id": "00000000-0000-0000-0000-000000000000", "transaction_type": "COLLECTION", "amount": 100, "transaction_date": "2023-01-01"})
    # Might fail due to foreign key or validation, but NOT 403
    assert response.status_code != 403

def test_junior_document_metadata_patch(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.JUNIOR)
    response = c.patch("/api/documents/00000000-0000-0000-0000-000000000000", json={"status": "VERIFIED"})
    assert response.status_code == 403

def test_admin_create_user(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.ADMIN)
    response = c.post("/api/users", json={
        "name": "New User",
        "email": "NEW@example.com",
        "password": "password",
        "role": "MANAGER"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["role"] == "MANAGER"

def test_duplicate_normalized_email(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.ADMIN)

    import uuid
    email = f"duplicate_{uuid.uuid4().hex[:8]}@example.com"

    first = c.post("/api/users", json={
        "name": "First User",
        "email": email.upper(),
        "password": "password",
        "role": "MANAGER"
    })
    assert first.status_code == 201

    response = c.post("/api/users", json={
        "name": "Duplicate User",
        "email": email,
        "password": "password",
        "role": "MANAGER"
    })
    assert response.status_code == 409
    assert "already" in response.json()["detail"].lower()


def test_junior_document_upload_allowed(client, db_session):
    c = _get_client_for_role(client, db_session, RoleEnum.JUNIOR)
    response = c.post("/api/documents/upload", files={"file": ("test.txt", b"content", "text/plain")})
    # Since we are mocking storage/client, it might return 422 or 404, but NOT 403
    assert response.status_code != 403
