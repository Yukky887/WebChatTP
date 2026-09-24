"""Роутер для истории чатов"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from uuid import UUID

from db.session import get_db
from db.models import User, ChatSession, Message
from dependencies.auth import require_auth

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("")
async def get_my_sessions(
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Список сессий текущего пользователя"""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(50)
    )
    sessions = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
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
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Сообщения конкретной сессии"""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Неверный ID сессии")
    
    # Проверяем что сессия принадлежит пользователю
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    
    if session.user_id != user.id:
        raise HTTPException(403, "Нет доступа")
    
    # Получаем сообщения
    result = await db.execute(
        select(Message)
        .where(Message.session_id == sid)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "program_id": m.program_id,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Удаляет сессию"""
    try:
        sid = UUID(session_id)
    except ValueError:
        raise HTTPException(400, "Неверный ID сессии")
    
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == sid)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    
    if session.user_id != user.id:
        raise HTTPException(403, "Нет доступа")
    
    await db.delete(session)
    await db.commit()
    
    return {"status": "ok"}