"""Fresh Initial Ecosystem Migration

Revision ID: 1a2b3c4d5e6f
Revises: 
Create Date: 2026-05-07 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1a2b3c4d5e6f'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('is_admin', sa.Boolean(), default=False),
        sa.Column('sso_user_id', sa.Integer(), nullable=True),
        sa.Column('telegram_chat_id', sa.String(length=50), nullable=True),
        sa.Column('push_interval_minutes', sa.Integer(), default=60),
        sa.Column('quiet_hour_start', sa.Integer(), default=22),
        sa.Column('quiet_hour_end', sa.Integer(), default=8),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('sso_user_id')
    )

    # 2. Create tags table
    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)

    # 3. Create reminders table
    op.create_table(
        'reminders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=True),
        sa.Column('content_text', sa.String(), nullable=True),
        sa.Column('memory_level', sa.Integer(), default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_pushed_at', sa.DateTime(), nullable=True),
        sa.Column('next_push_at', sa.DateTime(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), default=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. Create reminder_tags association table
    op.create_table(
        'reminder_tags',
        sa.Column('reminder_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['reminder_id'], ['reminders.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('reminder_id', 'tag_id')
    )

    # 5. Create attachments table
    op.create_table(
        'attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reminder_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('content_type', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['reminder_id'], ['reminders.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. Create system_settings table
    op.create_table(
        'system_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.String(), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key')
    )

    # 7. Create web_push_subscriptions table
    op.create_table(
        'web_push_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('endpoint', sa.String(), nullable=False),
        sa.Column('p256dh', sa.String(), nullable=False),
        sa.Column('auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint')
    )

    # 8. Create telegram_connections table
    op.create_table(
        'telegram_connections',
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('chat_id', sa.String(length=50), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('username')
    )

def downgrade():
    op.drop_table('telegram_connections')
    op.drop_table('web_push_subscriptions')
    op.drop_table('system_settings')
    op.drop_table('reminder_tags')
    op.drop_table('attachments')
    op.drop_table('reminders')
    op.drop_table('tags')
    op.drop_table('users')
