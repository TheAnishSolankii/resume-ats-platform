"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('user', 'admin', name='userrole'), server_default='user'),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('is_verified', sa.Boolean(), server_default='false'),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('plan', sa.Enum('free', 'pro', 'enterprise', name='subscriptionplan'), server_default='free'),
        sa.Column('stripe_customer_id', sa.String(255)),
        sa.Column('stripe_subscription_id', sa.String(255)),
        sa.Column('subscription_ends_at', sa.DateTime()),
        sa.Column('analyses_this_month', sa.Integer(), server_default='0'),
        sa.Column('analyses_reset_at', sa.DateTime()),
        sa.Column('total_analyses', sa.Integer(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    op.create_table('user_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE')),
        sa.Column('refresh_token', sa.String(500), unique=True),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('user_agent', sa.String(500)),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime()),
    )

    op.create_table('resumes',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('original_text', sa.Text(), nullable=False),
        sa.Column('file_url', sa.String(500)),
        sa.Column('file_type', sa.String(50)),
        sa.Column('job_description', sa.Text()),
        sa.Column('job_title', sa.String(255)),
        sa.Column('company', sa.String(255)),
        sa.Column('ats_score', sa.Float()),
        sa.Column('match_score', sa.Float()),
        sa.Column('analysis', JSON()),
        sa.Column('rewritten_text', sa.Text()),
        sa.Column('interview_questions', JSON()),
        sa.Column('status', sa.String(50), server_default='pending'),
        sa.Column('analysis_version', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    op.create_table('stripe_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('event_id', sa.String(255), unique=True),
        sa.Column('event_type', sa.String(100)),
        sa.Column('processed', sa.Boolean(), server_default='false'),
        sa.Column('payload', JSON()),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
    )

    # Indices
    op.create_index('ix_resumes_user_id', 'resumes', ['user_id'])
    op.create_index('ix_resumes_status', 'resumes', ['status'])
    op.create_index('ix_users_stripe_customer', 'users', ['stripe_customer_id'])


def downgrade():
    op.drop_table('stripe_events')
    op.drop_table('resumes')
    op.drop_table('user_sessions')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS userrole')
    op.execute('DROP TYPE IF EXISTS subscriptionplan')
