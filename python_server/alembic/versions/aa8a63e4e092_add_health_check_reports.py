"""add_health_check_reports

Stores the result of each run of deploy/healthcheck/daily_healthcheck.sh
so the Super Admin dashboard can show health history, not just the daily
email. The script inserts a row directly via the mysql client after each
run (same pattern as it already uses to read Postmark credentials from
.env) — no new API endpoint needed, keeping the ingestion path simple
and matching how other one-off scripts in this repo write to the DB.

Revision ID: aa8a63e4e092
Revises: fa83eb7e3e12
Create Date: 2026-09-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa8a63e4e092'
down_revision: Union[str, Sequence[str], None] = 'fa83eb7e3e12'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'health_check_reports',
        sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
        sa.Column('checked_at', sa.DateTime, nullable=False),
        sa.Column('overall_ok', sa.Boolean, nullable=False),
        sa.Column('frontend_ok', sa.Boolean, nullable=False),
        sa.Column('backend_ok', sa.Boolean, nullable=False),
        sa.Column('services_ok', sa.Boolean, nullable=False),
        sa.Column('ssl_days_left', sa.Integer, nullable=True),
        sa.Column('disk_pct', sa.Integer, nullable=True),
        sa.Column('report_text', sa.Text, nullable=False),
        sa.Column('created_at', sa.TIMESTAMP, server_default=sa.text('CURRENT_TIMESTAMP')),
        mysql_engine='InnoDB',
    )
    op.create_index('idx_hcr_checked_at', 'health_check_reports', ['checked_at'])


def downgrade() -> None:
    op.drop_table('health_check_reports')
