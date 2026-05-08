"""Add NRS priority score fields

Revision ID: nrs_priority_v1
Revises: 1a2b3c4d5e6f
Create Date: 2026-05-08 19:55:36.056711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'nrs_priority_v1'
down_revision: Union[str, Sequence[str], None] = '1a2b3c4d5e6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('reminders', schema=None) as batch_op:
        batch_op.add_column(sa.Column('priority_score', sa.Float(), nullable=False, server_default='500.0'))
        batch_op.add_column(sa.Column('manual_weight', sa.String(length=20), nullable=False, server_default='medium'))
        batch_op.add_column(sa.Column('last_reviewed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('reminders', schema=None) as batch_op:
        batch_op.drop_column('last_reviewed_at')
        batch_op.drop_column('manual_weight')
        batch_op.drop_column('priority_score')
