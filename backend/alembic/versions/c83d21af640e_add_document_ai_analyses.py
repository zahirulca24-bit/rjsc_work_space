"""Add document AI analyses.

Revision ID: c83d21af640e
Revises: 9f31c7d842aa
Create Date: 2026-10-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c83d21af640e"
down_revision: Union[str, Sequence[str], None] = "9f31c7d842aa"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "document_ai_analyses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("model", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("suggested_category", sa.String(), nullable=True),
        sa.Column("confidence", sa.Numeric(5, 4), nullable=True),
        sa.Column(
            "extracted_metadata",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "checklist_matches",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "missing_checklist_items",
            sa.JSON(),
            nullable=True,
        ),
        sa.Column(
            "needs_source_review",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "approved_by_user_id",
            sa.UUID(),
            nullable=True,
        ),
        sa.Column(
            "approved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
        ),
        sa.ForeignKeyConstraint(
            ["approved_by_user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_document_ai_analyses_document_id"),
        "document_ai_analyses",
        ["document_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_document_ai_analyses_document_id"),
        table_name="document_ai_analyses",
    )
    op.drop_table("document_ai_analyses")
