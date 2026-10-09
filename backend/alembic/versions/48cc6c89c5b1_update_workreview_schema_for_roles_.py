"""Update WorkReview schema for roles workflow

Revision ID: 48cc6c89c5b1
Revises: 922c196bfb66
Create Date: 2026-10-09 20:43:54.231104

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48cc6c89c5b1'
down_revision: Union[str, Sequence[str], None] = '922c196bfb66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('work_reviews', sa.Column('reviewer_user_id', sa.UUID(), nullable=True))
    op.add_column('work_reviews', sa.Column('reviewer_role', sa.String(), nullable=True))
    op.add_column('work_reviews', sa.Column('action', sa.String(), nullable=True))
    op.add_column('work_reviews', sa.Column('comment', sa.Text(), nullable=True))
    op.add_column('works', sa.Column('review_status', sa.String(), server_default='DRAFT', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('works', 'review_status')
    op.drop_column('work_reviews', 'comment')
    op.drop_column('work_reviews', 'action')
    op.drop_column('work_reviews', 'reviewer_role')
    op.drop_column('work_reviews', 'reviewer_user_id')
