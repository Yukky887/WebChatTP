# backend/routers/admin_router.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict

from models import LLMSettings as LLMSettingsSchema, BlockedModelsUpdate
from services.settings_service import (
    get_llm_settings, update_llm_settings, get_context_settings, update_context_settings
)
from services.provider_service import toggle_provider, set_api_key
from services.model_service import refresh_all_models, fetch_provider_models
from db.session import get_db
from db.repositories import ProviderRepository
from db.models import User
from services.state import state
from dependencies.auth import require_role


router = APIRouter(prefix="/api/admin", tags=["admin"])


# ==================== НАСТРОЙКИ LLM ====================

@router.get("/settings")
async def get_settings(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Получить все настройки"""
    await refresh_all_models()
    
    llm = await get_llm_settings(db)
    ctx = await get_context_settings(db)
    
    repo = ProviderRepository(db)
    providers = await repo.get_all_providers()
    all_models_db = await repo.get_allowed_models()
    fav_models_db = await repo.get_favorite_models()
    
    allowed = [m.name for m in all_models_db]
    favorites = [m.name for m in fav_models_db]
    
    providers_models = {}
    for p in providers:
        models = await fetch_provider_models(p)
        providers_models[p.id] = {
            "name": p.name,
            "all_models": models,
            "grouped": _group_by_family(models),
        }
    
    return {
        "settings": llm,
        "search_settings": ctx,
        "allowed_models": allowed,
        "favorite_models": favorites,
        "providers_models": providers_models,
        "providers": {
            p.id: {
                "name": p.name,
                "enabled": p.is_enabled,
                "api_key_set": bool(p.api_key_encrypted),
                "base_url": p.base_url,
            }
            for p in providers
        },
        "current_provider": state.current_provider,
        "current_model": state.current_model,
    }


@router.post("/settings")
async def update_settings(
    settings: LLMSettingsSchema,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Обновить настройки LLM"""
    result = await update_llm_settings(
        db,
        temperature=settings.temperature,
        top_p=settings.top_p,
        repeat_penalty=settings.repeat_penalty,
        max_tokens=settings.max_tokens,
        num_ctx=settings.num_ctx,
        system_prompt_template=settings.system_prompt_template,
    )
    return {"status": "ok", "settings": result}


@router.post("/settings/reset")
async def reset_settings(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Сбросить настройки LLM"""
    result = await update_llm_settings(
        db,
        temperature=0.5, top_p=0.9, repeat_penalty=1.1,
        max_tokens=8000, num_ctx=8192,
    )
    return {"status": "ok", "settings": result}


# ==================== НАСТРОЙКИ КОНТЕКСТА ====================

@router.get("/search-settings")
async def get_search_settings(
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    return await get_context_settings(db)


@router.post("/search-settings")
async def update_search_settings_endpoint(
    use_tickets: bool,
    use_documentation: bool,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await update_context_settings(
        db,
        use_tickets=use_tickets,
        use_documentation=use_documentation,
    )
    return result


# ==================== ПРОВАЙДЕРЫ ====================

@router.post("/provider/toggle")
async def provider_toggle(
    provider: str,
    enabled: bool,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await toggle_provider(db, provider, enabled)
    if not result:
        raise HTTPException(400, "Провайдер не найден")
    await refresh_all_models()
    return result


@router.post("/provider/apikey")
async def provider_apikey(
    provider: str,
    api_key: str,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await set_api_key(db, provider, api_key)
    if not result:
        raise HTTPException(400, "Провайдер не найден")
    return result


# ==================== МОДЕЛИ ====================

@router.post("/models/block")
async def update_models(
    data: BlockedModelsUpdate,
    user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    repo = ProviderRepository(db)
    await repo.update_allowed_models(data.allowed, data.favorites)
    await refresh_all_models()
    return {"allowed": data.allowed, "favorites": data.favorites}


# ==================== УТИЛИТЫ ====================

def _group_by_family(models: List[str]) -> Dict[str, List[str]]:
    """Группирует модели по семействам"""
    groups = {}
    for model in models:
        ml = model.lower()
        if 'gemma' in ml: family = 'Gemma'
        elif 'deepseek' in ml: family = 'DeepSeek'
        elif 'llama' in ml: family = 'Llama'
        elif 'qwen' in ml: family = 'Qwen'
        elif 'mistral' in ml: family = 'Mistral'
        elif 'phi' in ml: family = 'Phi'
        else: family = 'Other'
        
        if family not in groups:
            groups[family] = []
        groups[family].append(model)
    
    for family in groups:
        groups[family] = sorted(groups[family])
    return groups