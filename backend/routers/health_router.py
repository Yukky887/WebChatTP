# backend/routers/health_router.py
from fastapi import APIRouter, Depends
import requests
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_existing_collections
from config import WEAVIATE_URL
from db.session import get_db
from db.repositories import ProviderRepository
from services.model_service import refresh_all_models, _models_cache
from services.state import state

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
async def health(db: AsyncSession = Depends(get_db)):
    await refresh_all_models()
    
    status = {
        "weaviate": False,
        "qdrant": False,
        "model": True,
        "providers": {},
        "current_provider": state.current_provider,
        "current_model": state.current_model,
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
    
    # Провайдеры из БД
    repo = ProviderRepository(db)
    providers = await repo.get_all_providers()
    
    for p in providers:
        models = _models_cache.get(p.id, [])
        status["providers"][p.id] = {
            "name": p.name,
            "available": len(models) > 0 and p.is_enabled,
            "models_count": len(models),
            "models": models,
            "enabled": p.is_enabled,
        }
    
    return status