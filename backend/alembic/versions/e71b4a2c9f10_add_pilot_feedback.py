"""Add isolated pilot testing feedback table

Revision ID: e71b4a2c9f10
Revises: c83d21af640e
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e71b4a2c9f10"
down_revision = "c83d21af640e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "pilot_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("module", sa.String(length=60), nullable=False),
        sa.Column("test_case", sa.String(length=100), nullable=False),
        sa.Column("result", sa.String(length=30), nullable=False),
        sa.Column("ease", sa.String(length=30), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pilot_feedback_user_id", "pilot_feedback", ["user_id"])


def downgrade():
    op.drop_index("ix_pilot_feedback_user_id", table_name="pilot_feedback")
    op.drop_table("pilot_feedback")
