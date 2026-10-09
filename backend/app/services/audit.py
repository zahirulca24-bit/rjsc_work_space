import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import event, inspect, select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


AUDITED_TABLES = {
    "clients",
    "works",
    "work_checklists",
    "documents",
    "tasks",
    "work_reviews",
    "invoices",
    "transactions",
    "users",
}

SENSITIVE_FIELDS = {
    "password",
    "password_hash",
    "access_token",
    "token",
    "auth_secret",
    "storage_reference",
    "file_hash",
    "tin",
    "bin",
    "mobile",
}

_INSTALLED = False


def _json_safe(value: Any):
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, enum.Enum):
        return value.value
    return str(value)


def _safe_value(field: str, value: Any):
    if field.lower() in SENSITIVE_FIELDS:
        return "[REDACTED]"
    return _json_safe(value)


def _snapshot(obj):
    state = inspect(obj)
    result = {}

    for attr in state.mapper.column_attrs:
        key = attr.key
        if key == "id":
            continue

        try:
            value = getattr(obj, key)
        except Exception:
            continue

        result[key] = _safe_value(key, value)

    return result


def _changed_values(session, obj):
    state = inspect(obj)
    old_values = {}
    new_values = {}

    table = state.mapper.local_table
    identity = state.identity

    for attr in state.mapper.column_attrs:
        key = attr.key

        if key == "id":
            continue

        history = state.attrs[key].history
        if not history.has_changes():
            continue

        new_value = (
            history.added[0]
            if history.added
            else getattr(obj, key, None)
        )

        if history.deleted:
            old_value = history.deleted[0]
        else:
            old_value = None

            # After commit SQLAlchemy may expire attributes, so history.deleted
            # can be empty. Read the persisted value directly before UPDATE.
            if identity and key in table.c:
                pk_columns = list(state.mapper.primary_key)

                if len(pk_columns) == len(identity):
                    conditions = [
                        column == value
                        for column, value in zip(pk_columns, identity)
                    ]

                    old_value = session.connection().execute(
                        select(table.c[key]).where(*conditions)
                    ).scalar_one_or_none()

        old_values[key] = _safe_value(key, old_value)
        new_values[key] = _safe_value(key, new_value)

    return old_values, new_values


def _entity_id(obj):
    value = getattr(obj, "id", None)

    if value is None:
        value = uuid.uuid4()
        try:
            setattr(obj, "id", value)
        except Exception:
            return None

    if not isinstance(value, uuid.UUID):
        try:
            value = uuid.UUID(str(value))
        except Exception:
            return None

    return value


def install_audit_listeners():
    global _INSTALLED

    if _INSTALLED:
        return

    _INSTALLED = True

    @event.listens_for(Session, "before_flush")
    def audit_before_flush(session, flush_context, instances):
        if session.info.get("_audit_in_progress"):
            return

        performed_by = session.info.get("audit_user_id")
        if not performed_by:
            return

        pending_logs = []

        for obj in list(session.new):
            if isinstance(obj, AuditLog):
                continue

            table_name = getattr(getattr(obj, "__table__", None), "name", None)
            if table_name not in AUDITED_TABLES:
                continue

            entity_id = _entity_id(obj)
            if not entity_id:
                continue

            pending_logs.append(
                AuditLog(
                    entity_type=table_name,
                    entity_id=entity_id,
                    action="CREATE",
                    performed_by=str(performed_by),
                    old_values=None,
                    new_values=_snapshot(obj),
                )
            )

        for obj in list(session.dirty):
            if isinstance(obj, AuditLog):
                continue

            table_name = getattr(getattr(obj, "__table__", None), "name", None)
            if table_name not in AUDITED_TABLES:
                continue

            if not session.is_modified(obj, include_collections=False):
                continue

            entity_id = _entity_id(obj)
            if not entity_id:
                continue

            old_values, new_values = _changed_values(session, obj)
            if not new_values:
                continue

            pending_logs.append(
                AuditLog(
                    entity_type=table_name,
                    entity_id=entity_id,
                    action="UPDATE",
                    performed_by=str(performed_by),
                    old_values=old_values or None,
                    new_values=new_values or None,
                )
            )

        for obj in list(session.deleted):
            if isinstance(obj, AuditLog):
                continue

            table_name = getattr(getattr(obj, "__table__", None), "name", None)
            if table_name not in AUDITED_TABLES:
                continue

            entity_id = _entity_id(obj)
            if not entity_id:
                continue

            pending_logs.append(
                AuditLog(
                    entity_type=table_name,
                    entity_id=entity_id,
                    action="DELETE",
                    performed_by=str(performed_by),
                    old_values=_snapshot(obj),
                    new_values=None,
                )
            )

        if pending_logs:
            session.info["_audit_in_progress"] = True
            try:
                session.add_all(pending_logs)
            finally:
                session.info["_audit_in_progress"] = False
