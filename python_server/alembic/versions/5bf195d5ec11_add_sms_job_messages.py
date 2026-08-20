"""add_sms_job_messages

Per-recipient SMS delivery tracking, mirroring email_job_messages/
email_events. One row per SMS send attempt (success or failure), keyed
by Twilio's message SID so a status-callback webhook can update it as
Twilio reports queued -> sent -> delivered/failed/undelivered.

Revision ID: 5bf195d5ec11
Revises: d6a351830b6d
Create Date: 2026-08-20 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bf195d5ec11'
down_revision: Union[str, Sequence[str], None] = 'd6a351830b6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sms_job_messages',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('job_id', sa.Integer, nullable=False),
        sa.Column('voter_id', sa.Integer, nullable=True),
        sa.Column('twilio_sid', sa.String(64), nullable=True),
        sa.Column('recipient_phone', sa.String(32), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='queued'),
        sa.Column('error_code', sa.String(20), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('sent_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'),
                   server_onupdate=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('twilio_sid', name='uq_sjm_twilio_sid'),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_sjm_job', 'sms_job_messages', ['job_id'])
    op.create_index('idx_sjm_sid', 'sms_job_messages', ['twilio_sid'])
    op.create_index('idx_sjm_status', 'sms_job_messages', ['status'])


def downgrade() -> None:
    op.drop_table('sms_job_messages')
