"""add customer multitenancy

Revision ID: a1b2c3d4e5f6
Revises: 976528942561
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '976528942561'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('status', sa.String(20), server_default='Active', nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Add customer_id to users
    op.add_column('users', sa.Column('customer_id', sa.Integer(), nullable=True))
    op.add_column('users', sa.Column('email', sa.String(255), nullable=True))

    # Add customer_id to all tenant-scoped tables
    for table in [
        'counties', 'precincts', 'voters',
        'sms_templates', 'email_templates', 'whatsapp_templates',
        'sms_jobs', 'email_jobs', 'whatsapp_jobs',
        'sms_providers', 'email_providers', 'whatsapp_providers',
    ]:
        op.add_column(table, sa.Column('customer_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    for table in [
        'counties', 'precincts', 'voters',
        'sms_templates', 'email_templates', 'whatsapp_templates',
        'sms_jobs', 'email_jobs', 'whatsapp_jobs',
        'sms_providers', 'email_providers', 'whatsapp_providers',
    ]:
        op.drop_column(table, 'customer_id')

    op.drop_column('users', 'email')
    op.drop_column('users', 'customer_id')
    op.drop_table('customers')
