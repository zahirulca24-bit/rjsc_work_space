"""Batch 2: core RJSC service history schema and evidence fields.

Revision ID: 7a10b2c20262
Revises: 7a10b1c20261
"""
from alembic import op
import sqlalchemy as sa

revision = "7a10b2c20262"
down_revision = "7a10b1c20261"
branch_labels = None
depends_on = None

ANNUAL_COLUMNS = (
    sa.Column("work_id", sa.UUID(), sa.ForeignKey("works.id"), nullable=True),
    sa.Column("actual_agm_date", sa.Date(), nullable=True),
    sa.Column("audit_report_date", sa.Date(), nullable=True),
    sa.Column("dvc_date", sa.Date(), nullable=True),
    sa.Column("dvc_code", sa.String(), nullable=True),
    sa.Column("evidence_status", sa.String(), nullable=False, server_default="EVIDENCE_UNCERTAIN"),
    sa.Column("source_evidence", sa.String(), nullable=True),
)

CHARGE_COLUMNS = (
    sa.Column("work_id", sa.UUID(), sa.ForeignKey("works.id"), nullable=True),
    sa.Column("charge_type", sa.String(), nullable=False, server_default="CREATION"),
    sa.Column("instrument_type", sa.String(), nullable=True),
    sa.Column("instrument_date", sa.Date(), nullable=True),
    sa.Column("registration_date", sa.Date(), nullable=True),
    sa.Column("property_description", sa.Text(), nullable=True),
    sa.Column("modification_details", sa.Text(), nullable=True),
    sa.Column("satisfaction_noc_ref", sa.String(), nullable=True),
    sa.Column("statutory_form_code", sa.String(), nullable=False, server_default="FORM_XVIII"),
)


def _missing_columns(table_name, columns):
    from sqlalchemy import inspect
    existing = {c["name"] for c in inspect(op.get_bind()).get_columns(table_name)}
    return [col for col in columns if col.name not in existing]


def _ensure_index(table, column):
    from sqlalchemy import inspect
    idx_name = f"ix_{table}_{column}"
    existing = {i["name"] for i in inspect(op.get_bind()).get_indexes(table)}
    if idx_name not in existing:
        op.create_index(idx_name, table, [column])


def upgrade():
    from sqlalchemy import inspect
    from app.db.base import Base
    import app.models  # noqa: F401

    bind = op.get_bind()
    for col in _missing_columns("annual_return_history", ANNUAL_COLUMNS):
        op.add_column("annual_return_history", col)
    for col in _missing_columns("mortgage_charge_history", CHARGE_COLUMNS):
        op.add_column("mortgage_charge_history", col)

    _ensure_index("annual_return_history", "work_id")
    _ensure_index("mortgage_charge_history", "work_id")

    if not inspect(bind).has_table("share_transfer_history"):
        Base.metadata.tables["share_transfer_history"].create(bind=bind, checkfirst=True)


def downgrade():
    from sqlalchemy import inspect
    from app.db.base import Base
    import app.models  # noqa: F401

    bind = op.get_bind()
    if inspect(bind).has_table("share_transfer_history"):
        Base.metadata.tables["share_transfer_history"].drop(bind=bind, checkfirst=True)

    for table in ("annual_return_history", "mortgage_charge_history"):
        idx_name = f"ix_{table}_work_id"
        if idx_name in {i["name"] for i in inspect(bind).get_indexes(table)}:
            op.drop_index(idx_name, table_name=table)

    for table, columns in (
        ("mortgage_charge_history", CHARGE_COLUMNS),
        ("annual_return_history", ANNUAL_COLUMNS),
    ):
        current = {c["name"] for c in inspect(bind).get_columns(table)}
        for col in reversed(columns):
            if col.name in current:
                op.drop_column(table, col.name)
