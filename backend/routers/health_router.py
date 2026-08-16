from fastapi import APIRouter
import requests
from database import get_existing_collections
from config import WEAVIATE_URL, LLM_PROVIDERS, CURRENT_PROVIDER, CURRENT_MODEL
from services.model_service import refresh_all_models

router = APIRouter(prefix="/api", tags=["health"])

@router.get("/health")
async def health():
    await refresh_all_models()
    
    any_enabled = any(c["enabled"] for c in LLM_PROVIDERS.values())
    
    status = {
        "weaviate": False,
        "qdrant": False,
        "model": True,
        "providers": {},
        "current_provider": CURRENT_PROVIDER,
        "current_model": CURRENT_MODEL,
        "any_provider_enabled": any_enabled,
        "warning": None if any_enabled else "Все провайдеры отключены."
    }
    
    try:
        r = requests.get(f"{WEAVIATE_URL}/v1/meta", timeout=3)
        if r.status_code == 200:
            status["weaviate"] = True
    except:
        pass
    
    try:
        get_existing_collections()
        status["qdrant"] = True
    except:
        pass
    
    for pid, cfg in LLM_PROVIDERS.items():
        status["providers"][pid] = {
            "name": cfg["name"],
            "available": len(cfg["models"]) > 0 and cfg["enabled"],
            "models_count": len(cfg["models"]),
            "models": cfg["models"],
            "enabled": cfg["enabled"]
        }
    
    return status