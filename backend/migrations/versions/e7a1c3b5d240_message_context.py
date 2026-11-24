"""контекст расширения в сообщениях: страница и превью скриншотов

Revision ID: e7a1c3b5d240
Revises: d9c3f7a21b40
Create Date: 2026-11-24
"""
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = 'e7a1c3b5d240'
down_revision: Union[str, None] = 'd9c3f7a21b40'
branch_labels: Union[str, tuple, None] = None
depends_on: Union[str, tuple, None] = None


def upgrade() -> None:
    op.add_column('messages', sa.Column('context', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('messages', 'context')
