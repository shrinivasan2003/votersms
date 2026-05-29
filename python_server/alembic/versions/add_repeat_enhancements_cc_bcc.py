"""add enhanced repeat types, sms repeat columns, email template cc/bcc/reply_to

Revision ID: k1l2m3n4o5p6
Revises: j0k1l2m3n4o5
Create Date: 2026-05-29 17:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'k1l2m3n4o5p6'
down_revision: Union[str, Sequence[str], None] = 'j0k1l2m3n4o5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── email_jobs: new columns for monthly/quarterly/yearly scheduling ─────
    op.add_column('email_jobs', sa.Column('repeat_dom',   sa.SmallInteger(), nullable=True))
    op.add_column('email_jobs', sa.Column('repeat_month', sa.SmallInteger(), nullable=True))

    # ── sms_jobs: add full repeat scheduling support ────────────────────────
    op.add_column('sms_jobs', sa.Column('repeat_type',   sa.String(20),     nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_every',  sa.SmallInteger(), server_default='1', nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_days',   sa.String(100),    nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_time',   sa.String(8),      nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_until',  sa.Date(),         nullable=True))
    op.add_column('sms_jobs', sa.Column('parent_job_id', sa.Integer(),      nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_dom',    sa.SmallInteger(), nullable=True))
    op.add_column('sms_jobs', sa.Column('repeat_month',  sa.SmallInteger(), nullable=True))

    # ── email_templates: CC, BCC, Reply-To ─────────────────────────────────
    op.add_column('email_templates', sa.Column('cc',       sa.String(500), nullable=True))
    op.add_column('email_templates', sa.Column('bcc',      sa.String(500), nullable=True))
    op.add_column('email_templates', sa.Column('reply_to', sa.String(255), nullable=True))


def downgrade() -> None:
    for col in ('repeat_dom', 'repeat_month'):
        op.drop_column('email_jobs', col)

    for col in ('repeat_type', 'repeat_every', 'repeat_days', 'repeat_time',
                'repeat_until', 'parent_job_id', 'repeat_dom', 'repeat_month'):
        op.drop_column('sms_jobs', col)

    for col in ('cc', 'bcc', 'reply_to'):
        op.drop_column('email_templates', col)
