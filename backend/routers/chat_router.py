# backend/routers/chat_router.py
import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from models import ChatRequest, ChatResponse
from services.chat_service import process_chat
from services.state import state
from db.session import get_db
from db.repositories import ProviderRepository, ChatRepository
from db.models import User, ApiToken
from dependencies.auth import get_current_user, get_api_token


router = APIRouter(prefix="/api", tags=["Клиент · чат"])

# Лимиты изображений на одно сообщение
MAX_ATTACHMENTS = 4
MAX_ATTACHMENT_URI_LEN = 15_000_000  # base64 JPEG ~13.3 МБ нетто ≈ 10 МБ

# Лимит читабельного текста страницы от расширения
MAX_PAGE_TEXT = 12_000

# Vision-модель: Google закрыл gemini-2.5-flash-lite для новых ключей (404),
# поэтому дефолт — gemini-3.5-flash-lite; можно переопределить через VISION_MODEL
VISION_MODEL = os.getenv("VISION_MODEL", "google/gemini-3.5-flash-lite")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: Optional[User] = Depends(get_current_user),
    api_token: Optional[ApiToken] = Depends(get_api_token),
    db: AsyncSession = Depends(get_db),
):
    # Принципал: пользовательский JWT > API-токен > гость (аноним, как раньше)
    if user is not None:
        api_token = None

    provider = request.provider or state.current_provider
    model_name = request.model or state.current_model

    attachments = list(request.attachments or [])
    has_images = bool(attachments)

    # Валидация вложений
    if len(attachments) > MAX_ATTACHMENTS:
        raise HTTPException(400, f"Не больше {MAX_ATTACHMENTS} изображений на сообщение")
    for uri in attachments:
        if not uri.startswith("data:image/"):
            raise HTTPException(400, "Вложение должно быть data URI (data:image/...)")
        if len(uri) > MAX_ATTACHMENT_URI_LEN:
            raise HTTPException(400, "Изображение слишком большое (лимит ~10 МБ)")

    # Контекст страницы (браузерное расширение): URL/заголовок/читабельный текст
    page = None
    if request.page is not None:
        _ptext = (request.page.text or "").strip()
        _purl = (request.page.url or "").strip()
        _ptitle = (request.page.title or "").strip()
        if _ptext or _purl or _ptitle:
            page = {
                "url": _purl[:2000],
                "title": _ptitle[:500],
                "text": _ptext[:MAX_PAGE_TEXT],
            }

    # С картинками гоним через облачный vision
    if has_images:
        provider = "routerai"
        model_name = VISION_MODEL

    if not provider:
        raise HTTPException(400, "Провайдер не выбран")

    repo = ProviderRepository(db)
    providers = await repo.get_enabled_providers()
    if provider not in [p.id for p in providers]:
        raise HTTPException(400, f"Провайдер {provider} отключён")

    if not model_name:
        raise HTTPException(400, "Модель не выбрана")

    result = await process_chat(
        message=request.message,
        provider=provider,
        model=model_name,
        session_id=request.session_id,
        program=request.program,
        user_id=user.id if user else None,  # ← Привязка к юзеру
        attachments=attachments,
        use_web=request.use_web,
        page=page,
        call_operator=request.call_operator,
        allowed_collections=api_token.scopes if api_token else None,
        api_token_id=api_token.id if api_token else None,
        db=db,
    )
    return ChatResponse(**result)


@router.get("/chat/updates")
async def chat_updates(
    session_id: str,
    after_id: int = 0,
    user: Optional[User] = Depends(get_current_user),
    api_token: Optional[ApiToken] = Depends(get_api_token),
    db: AsyncSession = Depends(get_db),
):
    """Лента обновлений чата для клиента: новые сообщения (в т.ч. ответы
    оператора при эскалации) и текущий статус сессии.

    Клиент опрашивает её периодически (расширение — раз в ~5 с) с after_id
    последнего полученного сообщения; after_id=0 отдаёт всю переписку.

    Доступ: владелец-юзер, токен-владелец; гость — только ничейные сессии.
    """
    # Принципал как в /chat: пользовательский JWT > API-токен > гость
    if user is not None:
        api_token = None

    repo = ChatRepository(db)
    try:
        sid = UUID(session_id)
    except (ValueError, TypeError):
        raise HTTPException(400, "Некорректный session_id")

    session = await repo.get_session(sid)
    if not session:
        raise HTTPException(404, "Сессия не найдена")

    if user is not None:
        if session.user_id is not None and session.user_id != user.id:
            raise HTTPException(403, "Нет доступа к этой сессии")
    elif api_token is not None:
        if session.api_token_id != api_token.id:
            raise HTTPException(403, "Нет доступа к этой сессии")
    elif session.user_id is not None or session.api_token_id is not None:
        # гость: только сессии без владельца
        raise HTTPException(403, "Нет доступа к этой сессии")

    messages = await repo.get_messages_after(sid, max(after_id, 0))
    srcs = await repo.sources_for_messages([m.id for m in messages])
    return {
        "session_id": str(sid),
        "session_status": session.status or "active",
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "sources": [
                    {
                        "index": s.source_index,
                        "type": s.source_type,
                        "title": s.source_title,
                        "url": s.source_url,
                    }
                    for s in (srcs.get(m.id) or [])
                ],
            }
            for m in messages
        ],
    }