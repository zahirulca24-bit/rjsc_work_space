import pytest
from app.models.user import User, RoleEnum
from app.core.security import get_password_hash

def test_login_success(client, db_session):
    user = User(
        name="Test",
        email="test@example.com",
        password_hash=get_password_hash("password"),
        role=RoleEnum.ADMIN
    )
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password"})
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged in"

def test_login_wrong_password(client, db_session):
    user = User(
        name="Test2",
        email="test2@example.com",
        password_hash=get_password_hash("password"),
        role=RoleEnum.ADMIN
    )
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/auth/login", json={"email": "test2@example.com", "password": "wrong"})
    assert response.status_code == 401

def test_protected_route_without_auth():
    from fastapi.testclient import TestClient
    from app.main import app
    from app.api.deps import get_current_user
    
    old = app.dependency_overrides.get(get_current_user)
    if get_current_user in app.dependency_overrides:
        del app.dependency_overrides[get_current_user]
        
    try:
        fresh_client = TestClient(app)
        response = fresh_client.get("/api/clients")
        assert response.status_code == 401
    finally:
        if old:
            app.dependency_overrides[get_current_user] = old

def test_logout(client, db_session):
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Successfully logged out"
