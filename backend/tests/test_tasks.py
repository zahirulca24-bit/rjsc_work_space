import uuid
from datetime import date, datetime, timedelta, timezone

import pytest

from app.api.deps import get_current_user
from app.main import app
from app.models.client import Client, EntityType
from app.models.user import RoleEnum, User
from app.models.work import Work


@pytest.fixture(autouse=True)
def restore_auth_override():
    old = app.dependency_overrides.get(get_current_user)
    yield
    if old is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = old


def make_user(db, role):
    user = User(
        name=f"{role.value} Task User",
        email=f"{role.value.lower()}-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="test-only",
        role=role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def request_as(client, user, method, url, **kwargs):
    app.dependency_overrides[get_current_user] = lambda: user
    return getattr(client, method)(url, **kwargs)


def make_work(db):
    client = Client(
        client_code=f"TASK-{uuid.uuid4().hex[:8]}",
        legal_name="Task Test Client",
        entity_type=EntityType.PRIVATE_COMPANY,
        status="ACTIVE",
    )
    db.add(client)
    db.flush()

    work = Work(
        work_code=f"WORK-TASK-{uuid.uuid4().hex[:8]}",
        client_id=client.id,
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


def create_task(client, user, work, assignee=None, due_date=None, reminder_at=None):
    payload = {
        "work_id": str(work.id),
        "title": "Prepare filing papers",
        "priority": "HIGH",
    }

    if assignee:
        payload["assigned_user_id"] = str(assignee.id)
    if due_date:
        payload["due_date"] = due_date.isoformat()
    if reminder_at:
        payload["reminder_at"] = reminder_at.isoformat()

    return request_as(client, user, "post", "/api/tasks", json=payload)


def test_manager_can_create_assigned_task(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    junior = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    response = create_task(
        client,
        manager,
        work,
        assignee=junior,
        due_date=date.today() + timedelta(days=3),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["assigned_user_id"] == str(junior.id)
    assert data["assigned_user_name"] == junior.name
    assert data["deadline_state"] == "DUE_SOON"


def test_junior_cannot_create_task(client, db_session):
    junior = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    response = create_task(client, junior, work)
    assert response.status_code == 403


def test_overdue_and_no_due_date_states(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    work = make_work(db_session)

    overdue = create_task(
        client,
        manager,
        work,
        due_date=date.today() - timedelta(days=1),
    )
    assert overdue.status_code == 201
    assert overdue.json()["deadline_state"] == "OVERDUE"

    no_due = create_task(client, manager, work)
    assert no_due.status_code == 201
    assert no_due.json()["deadline_state"] == "NO_DUE_DATE"


def test_junior_can_update_own_task_status_only(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    junior = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    created = create_task(client, manager, work, assignee=junior)
    task_id = created.json()["id"]

    status_change = request_as(
        client,
        junior,
        "patch",
        f"/api/tasks/{task_id}",
        json={"status": "IN_PROGRESS"},
    )
    assert status_change.status_code == 200
    assert status_change.json()["status"] == "IN_PROGRESS"

    title_change = request_as(
        client,
        junior,
        "patch",
        f"/api/tasks/{task_id}",
        json={"title": "Junior rewrote title"},
    )
    assert title_change.status_code == 403


def test_junior_cannot_update_someone_elses_task(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    junior1 = make_user(db_session, RoleEnum.JUNIOR)
    junior2 = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    created = create_task(client, manager, work, assignee=junior1)
    task_id = created.json()["id"]

    response = request_as(
        client,
        junior2,
        "patch",
        f"/api/tasks/{task_id}",
        json={"status": "COMPLETED"},
    )
    assert response.status_code == 403


def test_completion_sets_completed_at(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    junior = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    created = create_task(client, manager, work, assignee=junior)
    task_id = created.json()["id"]

    completed = request_as(
        client,
        junior,
        "patch",
        f"/api/tasks/{task_id}",
        json={"status": "COMPLETED"},
    )

    assert completed.status_code == 200
    assert completed.json()["completed_at"] is not None
    assert completed.json()["deadline_state"] == "COMPLETED"


def test_due_reminder_and_acknowledge(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    junior = make_user(db_session, RoleEnum.JUNIOR)
    work = make_work(db_session)

    reminder_at = datetime.now(timezone.utc) - timedelta(minutes=5)

    created = create_task(
        client,
        manager,
        work,
        assignee=junior,
        reminder_at=reminder_at,
    )

    task_id = created.json()["id"]

    reminders = request_as(
        client,
        junior,
        "get",
        "/api/tasks/reminders",
    )

    assert reminders.status_code == 200
    ids = [item["id"] for item in reminders.json()]
    assert task_id in ids

    acknowledged = request_as(
        client,
        junior,
        "post",
        f"/api/tasks/{task_id}/acknowledge-reminder",
    )

    assert acknowledged.status_code == 200
    assert acknowledged.json()["reminder_acknowledged_at"] is not None
    assert acknowledged.json()["reminder_due"] is False


def test_senior_cannot_delete_task(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    senior = make_user(db_session, RoleEnum.SENIOR)
    work = make_work(db_session)

    created = create_task(client, manager, work)
    task_id = created.json()["id"]

    response = request_as(
        client,
        senior,
        "delete",
        f"/api/tasks/{task_id}",
    )

    assert response.status_code == 403


def test_manager_can_delete_task(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    work = make_work(db_session)

    created = create_task(client, manager, work)
    task_id = created.json()["id"]

    response = request_as(
        client,
        manager,
        "delete",
        f"/api/tasks/{task_id}",
    )

    assert response.status_code == 204


def test_unknown_work_rejected(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)

    response = request_as(
        client,
        manager,
        "post",
        "/api/tasks",
        json={
            "work_id": str(uuid.uuid4()),
            "title": "Invalid work",
            "priority": "LOW",
        },
    )

    assert response.status_code == 404


def test_inactive_assignee_rejected(client, db_session):
    manager = make_user(db_session, RoleEnum.MANAGER)
    inactive = make_user(db_session, RoleEnum.JUNIOR)
    inactive.is_active = False
    db_session.commit()

    work = make_work(db_session)

    response = create_task(
        client,
        manager,
        work,
        assignee=inactive,
    )

    assert response.status_code == 422
