import uuid

import pytest

from app.api.deps import get_current_user
from app.main import app
from app.models.audit import AuditLog
from app.models.client import Client, EntityType
from app.models.user import RoleEnum, User
from app.models.work import Work


@pytest.fixture(autouse=True)
def restore_override():
    old = app.dependency_overrides.get(get_current_user)
    yield

    if old is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = old


def make_user(db, role):
    user = User(
        name=f"{role.value} Audit User",
        email=f"audit-{role.value.lower()}-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="secret-hash-never-expose",
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def request_as(client, user, method, url, **kwargs):
    app.dependency_overrides[get_current_user] = lambda: user

    # Dependency overrides bypass get_current_user, so mirror the
    # request-scoped audit identity explicitly for this test request.
    from app.db.session import SessionLocal

    original = app.dependency_overrides.get(get_current_user)

    def override():
        return user

    app.dependency_overrides[get_current_user] = override
    return getattr(client, method)(url, **kwargs)


def make_client(db):
    row = Client(
        client_code=f"AUD-{uuid.uuid4().hex[:8]}",
        legal_name="Audit Test Client",
        entity_type=EntityType.PRIVATE_COMPANY,
        status="ACTIVE",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def make_work(db, client_row):
    work = Work(
        work_code=f"AUD-WORK-{uuid.uuid4().hex[:8]}",
        client_id=client_row.id,
        service_id="GENERIC_OTHER_DOCUMENT",
        entity_type="PRIVATE_COMPANY",
        status="In Progress",
        professional_fee=0,
        government_fee=None,
        other_cost=0,
    )
    db.add(work)
    db.commit()
    db.refresh(work)
    return work


def test_security_headers(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "camera=()" in response.headers["permissions-policy"]


def test_audit_api_role_permissions(client, db_session):
    junior = make_user(db_session, RoleEnum.JUNIOR)
    senior = make_user(db_session, RoleEnum.SENIOR)
    manager = make_user(db_session, RoleEnum.MANAGER)
    admin = make_user(db_session, RoleEnum.ADMIN)

    app.dependency_overrides[get_current_user] = lambda: junior
    assert client.get("/api/audit-logs").status_code == 403

    app.dependency_overrides[get_current_user] = lambda: senior
    assert client.get("/api/audit-logs").status_code == 403

    app.dependency_overrides[get_current_user] = lambda: manager
    assert client.get("/api/audit-logs").status_code == 200

    app.dependency_overrides[get_current_user] = lambda: admin
    assert client.get("/api/audit-logs").status_code == 200


def test_sensitive_values_are_redacted(db_session):
    from app.services.audit import _safe_value

    assert _safe_value("password_hash", "top-secret") == "[REDACTED]"
    assert _safe_value("storage_reference", "drive-id") == "[REDACTED]"
    assert _safe_value("tin", "123") == "[REDACTED]"
    assert _safe_value("bin", "456") == "[REDACTED]"
    assert _safe_value("mobile", "01700000000") == "[REDACTED]"


def test_authenticated_session_generates_audit(db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    client_row = make_client(db_session)

    db_session.info["audit_user_id"] = str(manager.id)
    db_session.info["audit_user_role"] = manager.role.value

    work = Work(
        work_code=f"AUD-WORK-{uuid.uuid4().hex[:8]}",
        client_id=client_row.id,
        service_id="GENERIC_OTHER_DOCUMENT",
        entity_type="PRIVATE_COMPANY",
        status="In Progress",
        professional_fee=0,
        government_fee=None,
        other_cost=0,
    )

    db_session.add(work)
    db_session.commit()

    log = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "works",
            AuditLog.entity_id == work.id,
            AuditLog.action == "CREATE",
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )

    assert log is not None
    assert log.performed_by == str(manager.id)
    assert log.old_values is None
    assert log.new_values["work_code"] == work.work_code


def test_update_audit_has_old_and_new_values(db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    client_row = make_client(db_session)
    work = make_work(db_session, client_row)

    db_session.info["audit_user_id"] = str(manager.id)

    work.notes = "first note"
    db_session.commit()

    db_session.info["audit_user_id"] = str(manager.id)
    work.notes = "updated note"
    db_session.commit()

    log = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "works",
            AuditLog.entity_id == work.id,
            AuditLog.action == "UPDATE",
        )
        .order_by(AuditLog.created_at.desc())
        .first()
    )

    assert log is not None
    assert log.old_values["notes"] == "first note"
    assert log.new_values["notes"] == "updated note"


def test_no_audit_when_no_authenticated_identity(db_session):
    client_row = make_client(db_session)

    work = Work(
        work_code=f"NOAUD-{uuid.uuid4().hex[:8]}",
        client_id=client_row.id,
        service_id="GENERIC_OTHER_DOCUMENT",
        entity_type="PRIVATE_COMPANY",
        status="In Progress",
        professional_fee=0,
        government_fee=None,
        other_cost=0,
    )

    db_session.info.pop("audit_user_id", None)
    db_session.add(work)
    db_session.commit()

    log = (
        db_session.query(AuditLog)
        .filter(
            AuditLog.entity_type == "works",
            AuditLog.entity_id == work.id,
        )
        .first()
    )

    assert log is None
