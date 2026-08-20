from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse
from services.chat_service import process_chat
from config import LLM_PROVIDERS
from services.state import state

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    provider = request.provider or state.current_provider
    model_name = request.model or state.current_model
    
    if provider not in LLM_PROVIDERS:
        raise HTTPException(400, "Неизвестный провайдер")
    if not LLM_PROVIDERS[provider]["enabled"]:
        raise HTTPException(400, "Провайдер отключен")
    if not model_name:
        raise HTTPException(400, "Нет доступных моделей")
    
    result = await process_chat(request.message, provider, model_name, request.session_id, request.program)
    return ChatResponse(**result)