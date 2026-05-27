"""add platform settings table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-27 02:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'platform_settings',
        sa.Column('id',    sa.Integer,     primary_key=True, autoincrement=True),
        sa.Column('key',   sa.String(100), nullable=False, unique=True),
        sa.Column('value', sa.Text,        nullable=True),
    )


def downgrade() -> None:
    op.drop_table('platform_settings')
