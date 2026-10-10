"""Create independent evidence-linked RJSC snapshots.

Revision ID: f90acb109b23
Revises: e71b4a2c9f10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "f90acb109b23"
down_revision = "e71b4a2c9f10"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "rjsc_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("client_id", UUID(as_uuid=True), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("source_reference", sa.String(), nullable=False),
        sa.Column("checked_on", sa.Date(), nullable=False),
        sa.Column("checked_by", sa.String(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("fields", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_rjsc_snapshots_client_id", "rjsc_snapshots", ["client_id"])

def downgrade():
    op.drop_index("ix_rjsc_snapshots_client_id", table_name="rjsc_snapshots")
    op.drop_table("rjsc_snapshots")
