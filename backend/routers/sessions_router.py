"""Роутер для истории чатов"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID
from typing import Optional, Tuple

from db.session import get_db
from db.models import User, ApiToken, ChatSession, Message, MessageSource
from dependencies.auth import get_current_user, get_api_token

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


async def require_principal(
    user: Optional[User] = Depends(get_current_user),
    api_token: Optional[ApiToken] = Depends(get_api_token),
) -> Tuple[Optional[User], Optional[ApiToken]]:
    """Историю видит юзер (свои сессии) или API-токен (свои сессии)."""
    if user is not None:
        return user, None
    if api_token is not None:
        return None, api_token
    raise HTTPException(401, "Требуется авторизация")


@router.get("")
async def get_my_sessions(
    principal: Tuple = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
):
    """Список сессий текущего пользователя или API-токена (последние 100)"""
    user, api_token = principal
    query = select(ChatSession).order_by(desc(ChatSession.updated_at)).limit(100)
    if user is not None:
        query = query.where(ChatSession.user_id == user.id)
    else:
        query = query.where(ChatSession.api_token_id == api_token.id, ChatSession.user_id.is_(None))
    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "title": s.title,
            "provider_id": s.provider_id,
            "selected_program": s.selected_program,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    principal: Tuple = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
):
    """Сообщения конкретной сессии"""
    user, api_token = principal
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Неверный ID сессии")

    session = (await db.execute(select(ChatSession).where(ChatSession.id == sid))).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    if user is not None:
        if session.user_id != user.id:
            raise HTTPException(403, "Нет доступа")
    else:
        if session.api_token_id != api_token.id or session.user_id is not None:
            raise HTTPException(403, "Нет доступа")
    
    # Получаем сообщения
    result = await db.execute(
        select(Message)
        .where(Message.session_id == sid)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()

    # Источники сообщений (message_sources) — группируем по message_id
    msg_ids = [m.id for m in messages if m.role == "assistant"]
    sources_by_message: dict = {}
    if msg_ids:
        src_result = await db.execute(
            select(MessageSource)
            .where(MessageSource.message_id.in_(msg_ids))
            .order_by(MessageSource.source_index)
        )
        for ms in src_result.scalars():
            sources_by_message.setdefault(ms.message_id, []).append({
                "index": ms.source_index or 0,
                "type": ms.source_type or "unknown",
                "title": ms.source_title or "",
                "url": ms.source_url or "",
                "score": float(ms.qdrant_score) if ms.qdrant_score is not None else 0,
            })

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "program_id": m.program_id,
            "sources": sources_by_message.get(m.id, []),
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    principal: Tuple = Depends(require_principal),
    db: AsyncSession = Depends(get_db),
):
    """Удаляет сессию"""
    user, api_token = principal
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Неверный ID сессии")

    session = (await db.execute(select(ChatSession).where(ChatSession.id == sid))).scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    if user is not None:
        if session.user_id != user.id:
            raise HTTPException(403, "Нет доступа")
    else:
        if session.api_token_id != api_token.id or session.user_id is not None:
            raise HTTPException(403, "Нет доступа")
    
    await db.delete(session)
    await db.commit()
    
    return {"status": "ok"}