# backend/routers/tokens_router.py
"""Управление API-токенами внешних интеграций (только для админа).

Токен генерируется при создании и показывается ОДИН РАЗ — в БД хранится
только его sha256-хэш. Скоупы = доступные коллекции поиска:
"tickets", "parts_intellect", "parts_resource".
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from config import QDRANT_COLLECTIONS
from db.session import get_db
from db.models import ApiToken, User
from db.repositories import ApiTokenRepository
from dependencies.auth import require_role, API_TOKEN_PREFIX, hash_api_token
import secrets

router = APIRouter(prefix="/api/admin/tokens", tags=["Админ · API-токены"])

# Разрешённые скоупы = ключи QDRANT_COLLECTIONS
ALLOWED_SCOPES = list(QDRANT_COLLECTIONS.keys())


class TokenCreate(BaseModel):
    name: str
    scopes: List[str]
    is_active: bool = True


class TokenToggle(BaseModel):
    is_active: bool


def _serialize(t: ApiToken) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "prefix": t.prefix,
        "scopes": t.scopes or [],
        "is_active": t.is_active,
        "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("")
async def list_tokens(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Список API-токенов (без секретов)."""
    repo = ApiTokenRepository(db)
    rows = await repo.list_all()
    return {
        "tokens": [_serialize(t) for t in rows],
        "allowed_scopes": ALLOWED_SCOPES,
    }


@router.post("")
async def create_token(
    data: TokenCreate,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Создаёт токен. Сырое значение возвращается ТОЛЬКО здесь."""
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(400, "Укажите название токена (например, «Отдел продаж»)")
    if len(name) > 100:
        raise HTTPException(400, "Название слишком длинное (максимум 100 символов)")

    bad = [s for s in data.scopes if s not in ALLOWED_SCOPES]
    if bad:
        raise HTTPException(400, f"Неизвестные коллекции: {', '.join(bad)}. Разрешены: {', '.join(ALLOWED_SCOPES)}")
    if not data.scopes:
        raise HTTPException(400, "Нужно выбрать хотя бы одну коллекцию")

    raw = API_TOKEN_PREFIX + secrets.token_urlsafe(24)
    repo = ApiTokenRepository(db)
    token = await repo.create(
        name=name,
        token_hash=hash_api_token(raw),
        prefix=raw[len(API_TOKEN_PREFIX):len(API_TOKEN_PREFIX) + 8],
        scopes=data.scopes,
        created_by=user.id if user else None,
    )
    if not data.is_active:
        await repo.set_active(token.id, False)

    result = _serialize(token)
    if not data.is_active:
        result["is_active"] = False
    result["token"] = raw  # ⚠️ показывается один раз
    return result


@router.post("/{token_id}/toggle")
async def toggle_token(
    token_id: int,
    data: TokenToggle,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Включить/отключить токен (отзыв = is_active=False)."""
    repo = ApiTokenRepository(db)
    token = await repo.set_active(token_id, data.is_active)
    if not token:
        raise HTTPException(404, "Токен не найден")
    return _serialize(token)


@router.delete("/{token_id}")
async def delete_token(
    token_id: int,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Удаляет токен (сессии, созданные по нему, остаются)."""
    repo = ApiTokenRepository(db)
    if not await repo.delete(token_id):
        raise HTTPException(404, "Токен не найден")
    return {"status": "ok"}
