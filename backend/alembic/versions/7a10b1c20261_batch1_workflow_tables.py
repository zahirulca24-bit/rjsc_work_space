"""Batch 1: persist RJSC working papers, PDF forms and filing workflow.

Revision ID: 7a10b1c20261
Revises: f90acb109b23
"""
from alembic import op
from sqlalchemy import inspect

revision = "7a10b1c20261"
down_revision = "f90acb109b23"
branch_labels = None
depends_on = None

NEW_TABLES = (
    "working_papers",
    "generated_forms",
    "work_submissions",
    "work_queries",
    "work_deliveries",
)


def upgrade():
    # Models are imported by the Alembic environment. Create ONLY the new
    # Batch 1 tables; do not alter or rebuild the existing client register.
    from app.db.base import Base
    import app.models  # noqa: F401

    connection = op.get_bind()
    for name in NEW_TABLES:
        if inspect(connection).has_table(name):
            continue  # Compatible with pre-existing local create_all databases.
        Base.metadata.tables[name].create(bind=connection, checkfirst=True)


def downgrade():
    from app.db.base import Base
    import app.models  # noqa: F401

    connection = op.get_bind()
    for name in reversed(NEW_TABLES):
        if inspect(connection).has_table(name):
            Base.metadata.tables[name].drop(bind=connection, checkfirst=True)
