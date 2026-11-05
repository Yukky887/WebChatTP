# backend/db/repositories/token_repo.py
"""Репозиторий API-токенов."""
from typing import List, Optional
from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

from db.models import ApiToken


class ApiTokenRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, name: str, token_hash: str, prefix: str,
                     scopes: List[str], created_by: Optional[int] = None) -> ApiToken:
        token = ApiToken(
            name=name,
            token_hash=token_hash,
            prefix=prefix,
            scopes=list(scopes),
            is_active=True,
            created_by=created_by,
        )
        self.db.add(token)
        await self.db.commit()
        await self.db.refresh(token)
        return token

    async def get_by_hash(self, token_hash: str) -> Optional[ApiToken]:
        result = await self.db.execute(
            select(ApiToken).where(ApiToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> List[ApiToken]:
        result = await self.db.execute(
            select(ApiToken).order_by(desc(ApiToken.created_at))
        )
        return list(result.scalars().all())

    async def get(self, token_id: int) -> Optional[ApiToken]:
        result = await self.db.execute(
            select(ApiToken).where(ApiToken.id == token_id)
        )
        return result.scalar_one_or_none()

    async def touch(self, token_id: int) -> None:
        """Отметка последнего использования (не спамим записями в БД: ≥30 сек)."""
        token = await self.get(token_id)
        if not token:
            return
        now = datetime.utcnow()
        if token.last_used_at and (now - token.last_used_at).total_seconds() < 30:
            return
        token.last_used_at = now
        await self.db.commit()

    async def set_active(self, token_id: int, is_active: bool) -> Optional[ApiToken]:
        token = await self.get(token_id)
        if token:
            token.is_active = is_active
            await self.db.commit()
            await self.db.refresh(token)
        return token

    async def delete(self, token_id: int) -> bool:
        token = await self.get(token_id)
        if token:
            await self.db.delete(token)
            await self.db.commit()
            return True
        return False
