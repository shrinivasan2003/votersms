"""add repeat schedule columns to email_jobs

Revision ID: i9j0k1l2m3n4
Revises: h8i9j0k1l2m3
Create Date: 2026-05-29 14:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'i9j0k1l2m3n4'
down_revision: Union[str, Sequence[str], None] = 'h8i9j0k1l2m3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # repeat_type: 'daily' | 'weekly' | NULL (one-time)
    op.add_column('email_jobs', sa.Column('repeat_type',   sa.String(20),  nullable=True))
    # every N days or N weeks
    op.add_column('email_jobs', sa.Column('repeat_every',  sa.SmallInteger(), server_default='1', nullable=True))
    # JSON array of weekday names for weekly repeat, e.g. '["friday"]'
    op.add_column('email_jobs', sa.Column('repeat_days',   sa.String(100), nullable=True))
    # HH:MM string, e.g. "09:00"
    op.add_column('email_jobs', sa.Column('repeat_time',   sa.String(8),   nullable=True))
    # optional end date — NULL means repeat forever
    op.add_column('email_jobs', sa.Column('repeat_until',  sa.Date(),      nullable=True))
    # for spawned occurrences, references the very first job in the chain
    op.add_column('email_jobs', sa.Column('parent_job_id', sa.Integer(),   nullable=True))


def downgrade() -> None:
    for col in ('parent_job_id', 'repeat_until', 'repeat_time', 'repeat_days', 'repeat_every', 'repeat_type'):
        op.drop_column('email_jobs', col)
