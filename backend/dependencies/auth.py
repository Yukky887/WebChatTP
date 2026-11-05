# backend/dependencies/auth.py
"""Dependencies для проверки авторизации"""
import hashlib
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy import select

from db.session import get_db
from db.models import User, Role, ApiToken
from services.auth_service import decode_token

# Префикс API-токенов (виден и в списке админки, и в заголовках клиентов)
API_TOKEN_PREFIX = "wcb_"


def hash_api_token(raw_token: str) -> str:
    """sha256 от «сырого» токена — хэш хранится в БД, сам токен нет."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Получает текущего пользователя (опционально)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    if token.startswith(API_TOKEN_PREFIX):
        return None
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None

    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_api_token(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[ApiToken]:
    """API-токен внешней интеграции (опционально).

    Принимается заголовком `X-API-Key: wcb_...` или
    `Authorization: Bearer wcb_...`. Возвращает запись токена из БД.
    """
    raw = None
    if x_api_key and x_api_key.strip():
        raw = x_api_key.strip()
    elif authorization and authorization.startswith("Bearer "):
        candidate = authorization[7:].strip()
        if candidate.startswith(API_TOKEN_PREFIX):
            raw = candidate
    if not raw:
        return None

    from db.repositories import ApiTokenRepository
    repo = ApiTokenRepository(db)
    row = await repo.get_by_hash(hash_api_token(raw))
    if not row or not row.is_active:
        raise HTTPException(401, "Неверный или отозванный API-токен")
    await repo.touch(row.id)
    return row


async def require_auth(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Требует авторизации"""
    if not user or not user.is_active:
        raise HTTPException(401, "Требуется авторизация")
    return user


def require_role(role_name: str):  # ← БЕЗ async!
    """Фабрика для проверки роли"""
    async def check(
        user: User = Depends(require_auth),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        result = await db.execute(select(Role).where(Role.id == user.role_id))
        role = result.scalar_one_or_none()
        if not role or role.name != role_name:
            raise HTTPException(403, f"Требуется роль: {role_name}")
        return user
    return check