"""add list_meta_tags and list_member_meta_values tables

Revision ID: h8i9j0k1l2m3
Revises: g7h8i9j0k1l2
Create Date: 2026-05-29 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h8i9j0k1l2m3'
down_revision: Union[str, Sequence[str], None] = 'g7h8i9j0k1l2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'list_meta_tags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('list_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('tag_key', sa.String(100), nullable=False),
        sa.Column('tag_label', sa.String(255), nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('list_id', 'tag_key', name='uq_list_tag_key'),
    )
    op.create_index('idx_list_meta_tags_list_id', 'list_meta_tags', ['list_id'])

    op.create_table(
        'list_member_meta_values',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('list_id', sa.Integer(), nullable=False),
        sa.Column('voter_id', sa.Integer(), nullable=False),
        sa.Column('tag_key', sa.String(100), nullable=False),
        sa.Column('tag_value', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('list_id', 'voter_id', 'tag_key', name='uq_member_tag'),
    )
    op.create_index('idx_meta_values_list_voter', 'list_member_meta_values', ['list_id', 'voter_id'])


def downgrade() -> None:
    op.drop_table('list_member_meta_values')
    op.drop_table('list_meta_tags')
