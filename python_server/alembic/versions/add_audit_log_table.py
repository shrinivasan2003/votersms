"""add audit log table and created_by columns

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-29 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'g7h8i9j0k1l2'
down_revision: Union[str, Sequence[str], None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),
        sa.Column('entity_name', sa.String(255), nullable=True),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('performed_by_id', sa.Integer(), nullable=True),
        sa.Column('performed_by_name', sa.String(255), nullable=True),
        sa.Column('old_values', sa.JSON(), nullable=True),
        sa.Column('new_values', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_audit_customer', 'audit_logs', ['customer_id'])
    op.create_index('idx_audit_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('idx_audit_action', 'audit_logs', ['action'])
    op.create_index('idx_audit_created_at', 'audit_logs', ['created_at'])

    # Add created_by to entity tables (nullable — no breaking change for existing rows)
    for table in ('sms_templates', 'email_templates', 'whatsapp_templates', 'contact_lists'):
        op.add_column(table, sa.Column('created_by', sa.Integer(), nullable=True))

    # Add created_by + name to job tables
    for table in ('sms_jobs', 'email_jobs', 'whatsapp_jobs'):
        op.add_column(table, sa.Column('created_by', sa.Integer(), nullable=True))
        op.add_column(table, sa.Column('name', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_table('audit_logs')
    for table in ('sms_templates', 'email_templates', 'whatsapp_templates', 'contact_lists'):
        op.drop_column(table, 'created_by')
    for table in ('sms_jobs', 'email_jobs', 'whatsapp_jobs'):
        op.drop_column(table, 'created_by')
        op.drop_column(table, 'name')
