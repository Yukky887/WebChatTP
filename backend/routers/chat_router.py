# backend/routers/chat_router.py
import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from models import ChatRequest, ChatResponse
from services.chat_service import process_chat
from services.state import state
from db.session import get_db
from db.repositories import ProviderRepository
from db.models import User
from dependencies.auth import get_current_user


router = APIRouter(prefix="/api", tags=["chat"])

# Лимиты изображений на одно сообщение
MAX_ATTACHMENTS = 4
MAX_ATTACHMENT_URI_LEN = 15_000_000  # base64 JPEG ~13.3 МБ нетто ≈ 10 МБ

# Vision-модель: Google закрыл gemini-2.5-flash-lite для новых ключей (404),
# поэтому дефолт — gemini-3.5-flash-lite; можно переопределить через VISION_MODEL
VISION_MODEL = os.getenv("VISION_MODEL", "google/gemini-3.5-flash-lite")


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    user: Optional[User] = Depends(get_current_user),  # ← Опционально
    db: AsyncSession = Depends(get_db),
):
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
        db=db,
    )
    return ChatResponse(**result)