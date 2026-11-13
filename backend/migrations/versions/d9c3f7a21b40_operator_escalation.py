"""эскалация «бот → оператор»: operator_id, escalated_at в chat_sessions

Жизненный цикл сессии: active (бот) → waiting_operator (клиент позвал спеца)
→ operator_active (оператор ведёт диалог) → closed.
operator_id — кто из операторов взял чат; escalated_at — когда позвали спеца.

Revision ID: d9c3f7a21b40
Revises: b8d41f6c9e21
Create Date: 2026-11-13
"""
from typing import Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd9c3f7a21b40'
down_revision: Union[str, None] = 'b8d41f6c9e21'
branch_labels: Union[str, tuple, None] = None
depends_on: Union[str, tuple, None] = None


def upgrade() -> None:
    op.add_column(
        'chat_sessions',
        sa.Column('operator_id', sa.Integer(),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True),
    )
    op.add_column(
        'chat_sessions',
        sa.Column('escalated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('chat_sessions', 'escalated_at')
    op.drop_column('chat_sessions', 'operator_id')
