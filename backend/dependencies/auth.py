# backend/dependencies/auth.py
"""Dependencies для проверки авторизации"""
from fastapi import Header, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from sqlalchemy import select

from db.session import get_db
from db.models import User, Role
from services.auth_service import decode_token


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """Получает текущего пользователя (опционально)"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization[7:]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    
    user_id = int(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


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