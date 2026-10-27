"""Добавляет автоназвание чатов (chat_sessions.title) и заполняет его
для существующих сессий первым вопросом пользователя.

Revision ID: 7f2d9b0a3c41
Revises: c147d68f20e3
Create Date: 2026-10-27
"""
from typing import Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7f2d9b0a3c41'
down_revision: Union[str, None] = 'c147d68f20e3'
branch_labels: Union[str, None] = None
depends_on: Union[str, None] = None


def upgrade() -> None:
    op.add_column('chat_sessions', sa.Column('title', sa.String(length=255), nullable=True))

    # Название существующих сессий — первый вопрос пользователя в чате
    op.execute(r"""
        UPDATE chat_sessions cs
        SET title = q.title
        FROM (
            SELECT DISTINCT ON (m.session_id)
                m.session_id,
                left(regexp_replace(m.content, '\s+', ' ', 'g'), 60) AS title
            FROM messages m
            WHERE m.role = 'user'
            ORDER BY m.session_id, m.created_at
        ) q
        WHERE cs.id = q.session_id
    """)


def downgrade() -> None:
    op.drop_column('chat_sessions', 'title')
