"""add_email_templates_type

email_templates.type is read/written throughout app/api/email_jobs.py's
create/update handlers ('Plain Text' or 'HTML', defaulting to 'Plain Text' —
confirmed against src/pages/masters/EmailTemplates.jsx, the only two values
the frontend ever sends) but nothing in the repo ever created the column.
Same pattern as role_permissions (f00897b0728f): it existed in production
only by hand, and only surfaced on the new server when a real INSERT hit it
("Unknown column 'type'").

Revision ID: fa83eb7e3e12
Revises: f00897b0728f
Create Date: 2026-09-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa83eb7e3e12'
down_revision: Union[str, Sequence[str], None] = 'f00897b0728f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'email_templates',
        sa.Column('type', sa.String(20), nullable=False, server_default='Plain Text'),
    )


def downgrade() -> None:
    op.drop_column('email_templates', 'type')
