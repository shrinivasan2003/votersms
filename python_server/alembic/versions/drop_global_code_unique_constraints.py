"""drop global unique constraint on code columns — replace with per-customer scope

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-27 04:00:00.000000

The `code` column on template/provider tables had a database-level UNIQUE index
that was global across all customers. Customer B creating a template with the
same code as Customer A caused a 500 constraint violation. Dropping these
global indexes lets each customer manage their own codes independently.
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Tables whose `code` unique index needs to be dropped
_TABLES = [
    'email_templates',
    'email_providers',
    'whatsapp_templates',
    'sms_providers',
    'whatsapp_providers',
]


def upgrade() -> None:
    for table in _TABLES:
        try:
            op.drop_index('code', table_name=table)
        except Exception:
            pass  # index may already be gone or named differently


def downgrade() -> None:
    for table in _TABLES:
        try:
            op.create_unique_constraint(f'uq_{table}_code', table, ['code'])
        except Exception:
            pass
