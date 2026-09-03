"""add_role_permissions

The role_permissions join table is queried throughout app/api/permissions.py
and app/api/roles.py, but nothing in the repo ever created it — the only
candidate, scripts/create_role_permissions.py, is one of the abandoned debug
scripts with an empty `with connection.cursor() as cursor:` body, so it has
never worked. The table existed in production only because someone created
it by hand, which is why a fresh install came up without it.

Schema derived from actual usage:
  INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (...)
  DELETE FROM role_permissions WHERE role_id=... / WHERE permission_id=...
  LEFT JOIN role_permissions rp ON p.id = rp.permission_id

The composite primary key is what makes the INSERT IGNORE meaningful —
re-granting an existing permission is a silent no-op rather than a duplicate
row. Cascading deletes keep the join table consistent when a role or
permission is removed.

Revision ID: f00897b0728f
Revises: 5bf195d5ec11
Create Date: 2026-09-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f00897b0728f'
down_revision: Union[str, Sequence[str], None] = '5bf195d5ec11'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer, nullable=False),
        sa.Column('permission_id', sa.Integer, nullable=False),
        sa.Column('created_at', sa.TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('role_id', 'permission_id'),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], name='fk_rp_role', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], name='fk_rp_permission', ondelete='CASCADE'),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_rp_permission', 'role_permissions', ['permission_id'])


def downgrade() -> None:
    op.drop_table('role_permissions')
