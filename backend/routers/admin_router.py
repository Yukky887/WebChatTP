from fastapi import APIRouter, HTTPException
from models import LLMSettings, BlockedModelsUpdate, LoginRequest
from services.admin_service import (
    check_admin, login, logout, get_llm_settings,
    update_llm_settings, reset_settings, update_allowed_models,
    toggle_provider, set_api_key
)
from services.model_service import (
    refresh_all_models, get_providers_models,
    fetch_ollama_models_raw, fetch_llamacpp_models_raw, fetch_routerai_models_raw
)
from config import (
    LLM_PROVIDERS, ALLOWED_MODELS, FAVORITE_MODELS,
    CURRENT_PROVIDER, CURRENT_MODEL
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/login")
async def admin_login(request: LoginRequest):
    """Вход в админку"""
    token = login(request.password)
    if token:
        return {"token": token, "success": True}
    raise HTTPException(401, "Неверный пароль")

@router.post("/logout")
async def admin_logout(token: str):
    """Выход из админки"""
    logout(token)
    return {"success": True}

@router.get("/settings")
async def get_settings(token: str):
    """Получить настройки"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    # Обновляем модели
    await refresh_all_models()
    
    providers_models = await get_providers_models()
    
    return {
        "settings": get_llm_settings(),
        "allowed_models": list(ALLOWED_MODELS),
        "favorite_models": list(FAVORITE_MODELS),
        "providers_models": providers_models,
        "providers": {
            pid: {
                "name": c["name"],
                "enabled": c["enabled"],
                "models": c["models"],
                "api_key_set": bool(c.get("api_key")),
                "base_url": c["base_url"]
            }
            for pid, c in LLM_PROVIDERS.items()
        },
        "current_provider": CURRENT_PROVIDER,
        "current_model": CURRENT_MODEL
    }

@router.post("/settings")
async def update_settings(settings: LLMSettings, token: str):
    """Обновить настройки"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    result = update_llm_settings(settings.model_dump())
    return {"status": "ok", "settings": result}

@router.post("/settings/reset")
async def reset(token: str):
    """Сбросить настройки"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    result = reset_settings()
    return {"status": "ok", "settings": result}

@router.post("/models/block")
async def update_models(data: BlockedModelsUpdate, token: str):
    """Обновить белый список моделей"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    result = update_allowed_models(data.allowed, data.favorites)
    await refresh_all_models()
    return result

@router.post("/provider/toggle")
async def provider_toggle(provider: str, enabled: bool, token: str):
    """Включить/выключить провайдера"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    try:
        result = toggle_provider(provider, enabled)
        await refresh_all_models()
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/provider/apikey")
async def provider_apikey(provider: str, api_key: str, token: str):
    """Установить API ключ"""
    if not check_admin(token):
        raise HTTPException(401, "Требуется авторизация")
    
    try:
        result = set_api_key(provider, api_key)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/models/refresh")
async def models_refresh():
    """Принудительное обновление моделей"""
    await refresh_all_models()
    return {
        "providers": {
            pid: cfg["models"] for pid, cfg in LLM_PROVIDERS.items()
        },
        "current_provider": CURRENT_PROVIDER,
        "current_model": CURRENT_MODEL
    }