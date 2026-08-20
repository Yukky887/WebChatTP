from fastapi import APIRouter, HTTPException
from config import LLM_PROVIDERS
from services.state import state
from services.model_service import refresh_all_models

router = APIRouter(prefix="/api", tags=["providers"])

@router.get("/providers")
async def get_providers():
    await refresh_all_models()
    providers = []
    for pid, cfg in LLM_PROVIDERS.items():
        if cfg["enabled"]:
            providers.append({
                "id": pid,
                "name": cfg["name"],
                "api_type": cfg["api_type"],
                "models": cfg["models"],
                "available": len(cfg["models"]) > 0,
                "current": pid == state.current_provider
            })
    return {
        "providers": providers,
        "current_provider": state.current_provider,
        "current_model": state.current_model
    }

@router.post("/providers/select")
async def select_provider(provider: str, model: str = None):
    if provider not in LLM_PROVIDERS:
        raise HTTPException(400, "Неизвестный провайдер")
    if not LLM_PROVIDERS[provider]["enabled"]:
        raise HTTPException(400, "Провайдер отключен")
    if not LLM_PROVIDERS[provider]["models"]:
        raise HTTPException(400, "Нет доступных моделей")
    
    state.current_provider = provider
    state.current_model = (
        model if model in LLM_PROVIDERS[provider]["models"]
        else LLM_PROVIDERS[provider]["models"][0]
    )
    
    return {
        "provider": state.current_provider,
        "model": state.current_model
    }