import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_health_is_liveness(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "rjsc-backend",
    }


def test_readiness_checks_database(client):
    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["database"] == "ok"


def test_request_id_generated(client):
    response = client.get("/health")

    assert response.status_code == 200
    request_id = response.headers.get("x-request-id")

    assert request_id
    assert len(request_id) > 10


def test_request_id_preserved(client):
    request_id = "rjsc-test-request-123"

    response = client.get(
        "/health",
        headers={"X-Request-ID": request_id},
    )

    assert response.status_code == 200
    assert response.headers["x-request-id"] == request_id


def test_http_error_has_request_id(client):
    response = client.get(
        "/api/works/00000000-0000-0000-0000-000000000000"
    )

    assert response.status_code == 404
    body = response.json()

    assert body["detail"] == "Work not found"
    assert body["request_id"]


def test_validation_error_has_request_id(client):
    response = client.post(
        "/api/works",
        json={
            "client_id": "not-a-uuid",
            "service_id": "x",
            "entity_type": "PRIVATE_COMPANY",
            "status": "PENDING",
        },
    )

    assert response.status_code == 422
    assert response.json()["request_id"]


def test_security_headers(client):
    response = client.get("/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "camera=()" in response.headers["permissions-policy"]


def test_auth_response_no_store(client):
    response = client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"


def test_development_allows_localhost():
    settings = Settings(
        APP_ENV="development",
        DATABASE_URL="sqlite:///dev.db",
        AUTH_SECRET="dev-secret",
        CORS_ORIGINS=["http://localhost:3000"],
    )

    assert settings.APP_ENV == "development"


def test_production_requires_database():
    with pytest.raises((ValidationError, ValueError)):
        Settings(
            APP_ENV="production",
            DATABASE_URL=None,
            AUTH_SECRET="x" * 40,
            CORS_ORIGINS=["https://office.example.com"],
        )


def test_production_rejects_short_secret():
    with pytest.raises((ValidationError, ValueError)):
        Settings(
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db.example.com/app",
            AUTH_SECRET="short",
            CORS_ORIGINS=["https://office.example.com"],
        )


def test_production_rejects_wildcard_cors():
    with pytest.raises((ValidationError, ValueError)):
        Settings(
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db.example.com/app",
            AUTH_SECRET="x" * 40,
            CORS_ORIGINS=["*"],
        )


def test_production_rejects_localhost_cors():
    with pytest.raises((ValidationError, ValueError)):
        Settings(
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db.example.com/app",
            AUTH_SECRET="x" * 40,
            CORS_ORIGINS=["http://localhost:3000"],
        )


def test_google_drive_requires_credentials_in_production():
    with pytest.raises((ValidationError, ValueError)):
        Settings(
            APP_ENV="production",
            DATABASE_URL="postgresql+psycopg://user:pass@db.example.com/app",
            AUTH_SECRET="x" * 40,
            CORS_ORIGINS=["https://office.example.com"],
            STORAGE_PROVIDER="google_drive",
            GOOGLE_DRIVE_ROOT_FOLDER_ID=None,
            GOOGLE_SERVICE_ACCOUNT_JSON=None,
        )


def test_safe_production_config_is_accepted():
    settings = Settings(
        APP_ENV="production",
        DATABASE_URL="postgresql+psycopg://user:pass@db.example.com/app",
        AUTH_SECRET="x" * 40,
        CORS_ORIGINS=["https://office.example.com"],
        STORAGE_PROVIDER="local",
    )

    assert settings.APP_ENV == "production"
