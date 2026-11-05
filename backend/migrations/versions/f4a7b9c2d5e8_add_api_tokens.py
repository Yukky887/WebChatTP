"""API-токены для внешних интеграций: таблица api_tokens
и привязка chat_sessions.api_token_id (сессии, созданные по токену).

Revision ID: f4a7b9c2d5e8
Revises: 7f2d9b0a3c41
Create Date: 2026-11-05
"""
from typing import Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f4a7b9c2d5e8'
down_revision: Union[str, None] = '7f2d9b0a3c41'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.create_table(
        'api_tokens',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False, unique=True),
        sa.Column('prefix', sa.String(length=16), nullable=True),
        sa.Column('scopes', postgresql.JSONB(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true')),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()')),
    )
    op.create_index('ix_api_tokens_token_hash', 'api_tokens', ['token_hash'])

    op.add_column('chat_sessions', sa.Column(
        'api_token_id', sa.Integer(),
        sa.ForeignKey('api_tokens.id', ondelete='SET NULL'), nullable=True))
    op.create_index('ix_chat_sessions_api_token_id', 'chat_sessions', ['api_token_id'])


def downgrade() -> None:
    op.drop_index('ix_chat_sessions_api_token_id', table_name='chat_sessions')
    op.drop_column('chat_sessions', 'api_token_id')
    op.drop_index('ix_api_tokens_token_hash', table_name='api_tokens')
    op.drop_table('api_tokens')
