from fastapi import APIRouter, HTTPException
from config import LLM_PROVIDERS, CURRENT_PROVIDER, CURRENT_MODEL
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
                "current": pid == CURRENT_PROVIDER
            })
    return {
        "providers": providers,
        "current_provider": CURRENT_PROVIDER,
        "current_model": CURRENT_MODEL
    }

@router.post("/providers/select")
async def select_provider(provider: str, model: str = None):
    global CURRENT_PROVIDER, CURRENT_MODEL
    
    if provider not in LLM_PROVIDERS:
        raise HTTPException(400, "Неизвестный провайдер")
    if not LLM_PROVIDERS[provider]["enabled"]:
        raise HTTPException(400, "Провайдер отключен")
    if not LLM_PROVIDERS[provider]["models"]:
        raise HTTPException(400, "Нет доступных моделей")
    
    CURRENT_PROVIDER = provider
    CURRENT_MODEL = model if model in LLM_PROVIDERS[provider]["models"] else LLM_PROVIDERS[provider]["models"][0]
    
    return {"provider": CURRENT_PROVIDER, "model": CURRENT_MODEL}