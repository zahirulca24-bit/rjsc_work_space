"""Add task assignment and reminder fields.

Revision ID: 9f31c7d842aa
Revises: 48cc6c89c5b1
Create Date: 2026-10-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f31c7d842aa"
down_revision: Union[str, Sequence[str], None] = "48cc6c89c5b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("assigned_user_id", sa.UUID(), nullable=True))
    op.add_column("tasks", sa.Column("created_by_user_id", sa.UUID(), nullable=True))
    op.add_column("tasks", sa.Column("reminder_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("tasks", sa.Column("reminder_acknowledged_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index(
        op.f("ix_tasks_assigned_user_id"),
        "tasks",
        ["assigned_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_tasks_created_by_user_id"),
        "tasks",
        ["created_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_created_by_user_id"), table_name="tasks")
    op.drop_index(op.f("ix_tasks_assigned_user_id"), table_name="tasks")

    op.drop_column("tasks", "reminder_acknowledged_at")
    op.drop_column("tasks", "reminder_at")
    op.drop_column("tasks", "created_by_user_id")
    op.drop_column("tasks", "assigned_user_id")
