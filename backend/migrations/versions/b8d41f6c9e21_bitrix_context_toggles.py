"""bitrix toggles в context_settings

Тумблеры BitInfo_* (дампы Bitrix24) для веб-контекста LLM.
Хранятся в JSONB `bitrix_scopes` = {"bitrix_wiki": true, ...};
NULL = все выключены (дефолт: веб-клиент и гость bitrix не ищут).

Revision ID: b8d41f6c9e21
Revises: f4a7b9c2d5e8
Create Date: 2026-11-09
"""
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = 'b8d41f6c9e21'
down_revision: Union[str, None] = 'f4a7b9c2d5e8'
branch_labels: Union[str, tuple, None] = None
depends_on: Union[str, tuple, None] = None


def upgrade() -> None:
    op.add_column('context_settings', sa.Column('bitrix_scopes', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('context_settings', 'bitrix_scopes')
