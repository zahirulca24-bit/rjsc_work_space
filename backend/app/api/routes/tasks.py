from datetime import date, datetime, timezone
from typing import List, Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import RoleEnum, User
from app.models.work import Work
from app.models.workflow import Task


router = APIRouter()

TaskStatus = Literal["OPEN", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]

MANAGEMENT_ROLES = {
    RoleEnum.ADMIN.value,
    RoleEnum.MANAGER.value,
    RoleEnum.SENIOR.value,
}

DELETE_ROLES = {
    RoleEnum.ADMIN.value,
    RoleEnum.MANAGER.value,
}


class TaskCreate(BaseModel):
    work_id: UUID
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_user_id: Optional[UUID] = None
    priority: TaskPriority = "MEDIUM"
    due_date: Optional[date] = None
    reminder_at: Optional[datetime] = None

    model_config = ConfigDict(extra="forbid")


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    assigned_user_id: Optional[UUID] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[date] = None
    reminder_at: Optional[datetime] = None

    model_config = ConfigDict(extra="forbid")


class TaskRead(BaseModel):
    id: UUID
    work_id: UUID
    work_code: Optional[str]
    title: str
    description: Optional[str]
    assigned_to: Optional[str]
    assigned_user_id: Optional[UUID]
    assigned_user_name: Optional[str]
    created_by_user_id: Optional[UUID]
    status: str
    priority: str
    due_date: Optional[date]
    deadline_state: str
    reminder_at: Optional[datetime]
    reminder_due: bool
    reminder_acknowledged_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _deadline_state(task: Task) -> str:
    if task.status == "COMPLETED":
        return "COMPLETED"

    if task.due_date is None:
        return "NO_DUE_DATE"

    today = date.today()
    days = (task.due_date - today).days

    if days < 0:
        return "OVERDUE"
    if days == 0:
        return "DUE_TODAY"
    if days <= 7:
        return "DUE_SOON"
    return "UPCOMING"


def _reminder_due(task: Task) -> bool:
    if task.status in {"COMPLETED", "CANCELLED"}:
        return False
    if task.reminder_at is None:
        return False
    if task.reminder_acknowledged_at is not None:
        return False

    reminder_at = _normalize_datetime(task.reminder_at)
    return reminder_at <= _utc_now()


def _task_payload(task: Task, db: Session) -> dict:
    assigned_name = None

    if task.assigned_user_id:
        user = db.query(User).filter(User.id == task.assigned_user_id).first()
        if user:
            assigned_name = user.name

    work = db.query(Work).filter(Work.id == task.work_id).first()

    return {
        "id": task.id,
        "work_id": task.work_id,
        "work_code": work.work_code if work else None,
        "title": task.title,
        "description": task.description,
        "assigned_to": task.assigned_to,
        "assigned_user_id": task.assigned_user_id,
        "assigned_user_name": assigned_name or task.assigned_to,
        "created_by_user_id": task.created_by_user_id,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "deadline_state": _deadline_state(task),
        "reminder_at": task.reminder_at,
        "reminder_due": _reminder_due(task),
        "reminder_acknowledged_at": task.reminder_acknowledged_at,
        "completed_at": task.completed_at,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
    }


def _get_task(db: Session, task_id: UUID) -> Task:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


def _validate_assignee(db: Session, user_id: Optional[UUID]) -> Optional[User]:
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == user_id, User.is_active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=422, detail="Assigned user is invalid or inactive")
    return user


@router.get("", response_model=List[TaskRead])
def list_tasks(
    work_id: Optional[UUID] = Query(None),
    assigned_to_me: bool = Query(False),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task)

    if work_id:
        query = query.filter(Task.work_id == work_id)

    if assigned_to_me:
        query = query.filter(Task.assigned_user_id == current_user.id)

    if status:
        query = query.filter(Task.status == status)

    tasks = query.order_by(Task.due_date.asc(), Task.created_at.desc()).all()
    return [_task_payload(task, db) for task in tasks]


@router.get("/reminders", response_model=List[TaskRead])
def list_due_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = _role_value(current_user)

    query = db.query(Task).filter(
        Task.reminder_at.isnot(None),
        Task.reminder_acknowledged_at.is_(None),
        Task.status.notin_(["COMPLETED", "CANCELLED"]),
    )

    if role == RoleEnum.JUNIOR.value:
        query = query.filter(Task.assigned_user_id == current_user.id)

    tasks = query.order_by(Task.reminder_at.asc()).all()
    return [
        _task_payload(task, db)
        for task in tasks
        if _reminder_due(task)
    ]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task(db, task_id)
    return _task_payload(task, db)


@router.post("", response_model=TaskRead, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = _role_value(current_user)
    if role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Role cannot create tasks")

    work = db.query(Work).filter(Work.id == payload.work_id).first()
    if not work:
        raise HTTPException(status_code=404, detail="Work not found")

    assignee = _validate_assignee(db, payload.assigned_user_id)

    task = Task(
        work_id=payload.work_id,
        title=payload.title.strip(),
        description=payload.description,
        assigned_user_id=payload.assigned_user_id,
        assigned_to=assignee.name if assignee else None,
        created_by_user_id=current_user.id,
        status="OPEN",
        priority=payload.priority,
        due_date=payload.due_date,
        reminder_at=payload.reminder_at,
    )

    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_payload(task, db)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task(db, task_id)
    role = _role_value(current_user)

    update_data = payload.model_dump(exclude_unset=True)

    if role == RoleEnum.JUNIOR.value:
        if task.assigned_user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Task is not assigned to current user")

        disallowed = set(update_data.keys()) - {"status"}
        if disallowed:
            raise HTTPException(
                status_code=403,
                detail="JUNIOR may update task status only",
            )

    elif role not in MANAGEMENT_ROLES:
        raise HTTPException(status_code=403, detail="Role cannot update tasks")

    if "assigned_user_id" in update_data:
        assignee = _validate_assignee(db, update_data["assigned_user_id"])
        task.assigned_to = assignee.name if assignee else None

    for field, value in update_data.items():
        setattr(task, field, value)

    if payload.status == "COMPLETED" and task.completed_at is None:
        task.completed_at = _utc_now()
    elif payload.status is not None and payload.status != "COMPLETED":
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return _task_payload(task, db)


@router.post("/{task_id}/acknowledge-reminder", response_model=TaskRead)
def acknowledge_reminder(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = _get_task(db, task_id)
    role = _role_value(current_user)

    if role == RoleEnum.JUNIOR.value and task.assigned_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Task is not assigned to current user")

    task.reminder_acknowledged_at = _utc_now()
    db.commit()
    db.refresh(task)
    return _task_payload(task, db)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = _role_value(current_user)
    if role not in DELETE_ROLES:
        raise HTTPException(status_code=403, detail="Role cannot delete tasks")

    task = _get_task(db, task_id)
    db.delete(task)
    db.commit()
    return None
