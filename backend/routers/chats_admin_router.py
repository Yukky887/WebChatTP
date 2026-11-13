# backend/routers/chats_admin_router.py
"""Админ · чаты клиентов: просмотр клиентских сессий и вмешательство оператора.

Сессии с API-токенами — это клиенты (токены называются именем клиента:
домен/IP). Оператор может смотреть переписку, отвечать клиенту (сообщение
с ролью 'operator') и управлять статусом эскалации:

    active → waiting_operator (клиент позвал спеца)
           → operator_active (оператор взял чат) → closed.

Пока сессия в waiting_operator/operator_active, бот отвечает клиенту
паузой-заглушкой (см. process_chat) — драки «бот vs оператор» нет.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from db.session import get_db
from db.models import User, ApiToken
from db.repositories import ChatRepository
from dependencies.auth import require_role


router = APIRouter(prefix="/api/admin/chats", tags=["Админ · чаты клиентов"])

# Сессии с этими статусами показываются как «эскалации»
ESCALATION_STATUSES = ('waiting_operator', 'operator_active')


def _session_brief(s, token_name: Optional[str], msg_count: int, last_msg) -> dict:
    return {
        "id": str(s.id),
        "title": s.title,
        "client": token_name,
        "api_token_id": s.api_token_id,
        "status": s.status or "active",
        "operator_id": s.operator_id,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "escalated_at": s.escalated_at.isoformat() if s.escalated_at else None,
        "message_count": msg_count,
        "last_message": (last_msg.content[:140] if last_msg else None),
        "last_role": (last_msg.role if last_msg else None),
        "last_at": (last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None),
    }


def _message_brief(m, sources=None, usage=None) -> dict:
    return {
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "program_id": m.program_id,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "sources": [
            {
                "type": s.source_type,
                "title": s.source_title,
                "url": s.source_url,
                "index": s.source_index,
                "score": float(s.qdrant_score) if s.qdrant_score is not None else None,
            }
            for s in (sources or [])
        ],
        "usage": {
            "prompt_tokens": usage.prompt_tokens,
            "completion_tokens": usage.completion_tokens,
            "total_tokens": usage.total_tokens,
            "cost": float(usage.cost) if usage.cost is not None else 0,
        } if usage else None,
    }


async def _token_names(db: AsyncSession, token_ids) -> dict:
    ids = {tid for tid in token_ids if tid is not None}
    if not ids:
        return {}
    rows = (await db.execute(select(ApiToken).where(ApiToken.id.in_(ids)))).scalars().all()
    return {t.id: t.name for t in rows}


@router.get("")
async def list_chats(
    status: Optional[str] = None,
    token_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Список клиентских сессий: сначала ждущие спеца, далее по свежести."""
    repo = ChatRepository(db)
    sessions = await repo.list_sessions_admin(
        status=status, token_id=token_id,
        limit=min(max(limit, 1), 200), offset=max(offset, 0),
    )
    ids = [s.id for s in sessions]
    counts = await repo.message_counts(ids)
    lasts = await repo.last_messages(ids)
    names = await _token_names(db, (s.api_token_id for s in sessions))
    waiting = sum(1 for s in sessions if s.status in ESCALATION_STATUSES)
    return {
        "sessions": [
            _session_brief(s, names.get(s.api_token_id), counts.get(s.id, 0), lasts.get(s.id))
            for s in sessions
        ],
        "waiting": waiting,
    }


@router.get("/{session_id}")
async def get_chat(
    session_id: UUID,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Полная переписка сессии + статус эскалации."""
    repo = ChatRepository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    messages = await repo.get_transcript_messages(session_id)
    srcs = await repo.sources_for_messages([m.id for m in messages])
    usage = await repo.usage_for_messages([m.id for m in messages])
    names = await _token_names(db, [session.api_token_id])

    operator_name = None
    if session.operator_id:
        u = await db.get(User, session.operator_id)
        operator_name = u.username if u else None

    brief = _session_brief(session, names.get(session.api_token_id), len(messages), None)
    brief["operator_name"] = operator_name
    return {
        "session": brief,
        "messages": [
            _message_brief(m, srcs.get(m.id), usage.get(m.id))
            for m in messages
        ],
    }


class OperatorAction(BaseModel):
    # take — взять в работу; release — освободить (ждёт спеца дальше);
    # resume — вернуть боту; close — закрыть сессию.
    action: str


@router.post("/{session_id}/operator")
async def operator_action(
    session_id: UUID,
    body: OperatorAction,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Управление статусом эскалации со стороны оператора."""
    repo = ChatRepository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(404, "Сессия не найдена")

    action = body.action
    if action == "take":
        if session.operator_id and session.operator_id != user.id \
                and session.status == 'operator_active':
            raise HTTPException(409, "Чат уже ведёт другой оператор")
        s = await repo.set_session_status(session_id, 'operator_active', operator_id=user.id)
    elif action == "release":
        s = await repo.set_session_status(session_id, 'waiting_operator', clear_operator=True)
    elif action == "resume":
        s = await repo.set_session_status(session_id, 'active', clear_operator=True)
    elif action == "close":
        s = await repo.set_session_status(session_id, 'closed', clear_operator=True, closed=True)
    else:
        raise HTTPException(400, f"Неизвестное действие: {action}")
    return {
        "session_id": str(session_id),
        "status": s.status,
        "operator_id": s.operator_id,
    }


class OperatorMessage(BaseModel):
    text: str


@router.post("/{session_id}/message")
async def operator_message(
    session_id: UUID,
    body: OperatorMessage,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Ответ оператора клиенту (роль 'operator'). Чат автоматически
    переходит в operator_active: бот ставится на паузу."""
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(400, "Пустое сообщение")
    repo = ChatRepository(db)
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(404, "Сессия не найдена")

    if session.status != 'operator_active' or session.operator_id != user.id:
        # Вмешательство: бот замолкает, чат закрепляется за этим оператором
        session = await repo.set_session_status(session_id, 'operator_active', operator_id=user.id)
    msg = await repo.add_message(session_id=session_id, role='operator', content=text[:20000])
    return {
        "message_id": msg.id,
        "session_id": str(session_id),
        "status": session.status,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }
