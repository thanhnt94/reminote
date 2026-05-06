"""Add web push and telegram connections

Revision ID: a8d5e2f3b4c5
Revises: 9cf6cb2bb486
Create Date: 2026-05-06 17:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a8d5e2f3b4c5'
down_revision = '9cf6cb2bb486'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create web_push_subscriptions table
    op.create_table(
        'web_push_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('p256dh', sa.String(), nullable=False),
        sa.Column('auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint')
    )

    # 2. Create telegram_connections table
    op.create_table(
        'telegram_connections',
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('chat_id', sa.String(length=50), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('username')
    )

    # 3. Add sso_user_id to users if not exists
    # Check if column exists first (SQLite limitation workaround)
    # But since this is a clean migration from 9cf6cb2bb486, we can just add it
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('sso_user_id', sa.Integer(), nullable=True))
        batch_op.create_unique_constraint('uq_users_sso_user_id', ['sso_user_id'])

def downgrade():
    op.drop_table('telegram_connections')
    op.drop_table('web_push_subscriptions')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint('uq_users_sso_user_id', type_='unique')
        batch_op.drop_column('sso_user_id')
