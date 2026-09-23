# backend/routers/chat_router.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatRequest, ChatResponse
from services.chat_service import process_chat
from services.state import state
from db.session import get_db
from db.repositories import ProviderRepository

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    provider = request.provider or state.current_provider
    model_name = request.model or state.current_model
    
    if not provider:
        raise HTTPException(400, "Провайдер не выбран")
    
    # Проверяем провайдера в БД
    repo = ProviderRepository(db)
    providers = await repo.get_enabled_providers()
    
    if provider not in [p.id for p in providers]:
        raise HTTPException(400, f"Провайдер {provider} отключён или не существует")
    
    if not model_name:
        raise HTTPException(400, "Модель не выбрана")
    
    result = await process_chat(
        message=request.message,
        provider=provider,
        model=model_name,
        session_id=request.session_id,
        program=request.program,
        db=db,
    )
    return ChatResponse(**result)


@router.post("/chat/clear")
async def clear_chat(session_id: str, db: AsyncSession = Depends(get_db)):
    from db.repositories import ChatRepository
    from uuid import UUID
    
    try:
        repo = ChatRepository(db)
        await repo.delete_session(UUID(session_id))
    except Exception as e:
        print(f"⚠️ Ошибка удаления сессии: {e}")
    
    return {"status": "ok"}