"""add timezone column to customers table

Revision ID: j0k1l2m3n4o5
Revises: i9j0k1l2m3n4
Create Date: 2026-05-29 15:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'j0k1l2m3n4o5'
down_revision: Union[str, Sequence[str], None] = 'i9j0k1l2m3n4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Store IANA timezone name, default UTC
    op.add_column('customers', sa.Column('timezone', sa.String(50), server_default='UTC', nullable=False))


def downgrade() -> None:
    op.drop_column('customers', 'timezone')
