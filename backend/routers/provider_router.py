# backend/routers/provider_router.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import get_db
from db.repositories import ProviderRepository
from services.model_service import refresh_all_models, get_providers_with_models
from services.state import state

router = APIRouter(prefix="/api", tags=["providers"])


@router.get("/providers")
async def get_providers(db: AsyncSession = Depends(get_db)):
    await refresh_all_models()
    providers = await get_providers_with_models(db)
    return {
        "providers": providers,
        "current_provider": state.current_provider,
        "current_model": state.current_model,
    }


@router.post("/providers/select")
async def select_provider(
    provider: str,
    model: str = None,
    db: AsyncSession = Depends(get_db),
):
    repo = ProviderRepository(db)
    providers = await repo.get_enabled_providers()
    
    if provider not in [p.id for p in providers]:
        raise HTTPException(400, "Провайдер не найден или отключён")
    
    from services.model_service import _models_cache
    models = _models_cache.get(provider, [])
    
    if not models:
        raise HTTPException(400, "Нет доступных моделей")
    
    state.current_provider = provider
    state.current_model = model if model in models else models[0]
    
    return {
        "provider": state.current_provider,
        "model": state.current_model,
    }