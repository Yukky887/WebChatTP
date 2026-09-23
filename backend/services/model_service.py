# backend/services/model_service.py
"""Управление моделями (через БД)"""
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession

from db.session import AsyncSessionLocal
from db.repositories import ProviderRepository
from db.models import LLMProvider
from services.state import state


# Кэш моделей в памяти (обновляется через refresh)
_models_cache: Dict[str, List[str]] = {}


async def fetch_provider_models(provider: LLMProvider) -> List[str]:
    """Получает модели от провайдера по API"""
    import httpx
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            headers = {}
            if provider.api_key_encrypted:
                headers["Authorization"] = f"Bearer {provider.api_key_encrypted}"
            
            if provider.api_type == "ollama":
                # Ollama
                url = f"{provider.base_url}/api/tags"
                r = await client.get(url, headers=headers)
                if r.status_code == 200:
                    return sorted([m.get("name", "") for m in r.json().get("models", [])])
            else:
                # OpenAI-совместимый (llama.cpp, RouterAI)
                url = f"{provider.base_url}/models"
                r = await client.get(url, headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    models = [m.get("id", "") for m in data.get("data", [])]
                    if models:
                        return sorted(models)
    except Exception as e:
        print(f"⚠️ {provider.id} fetch error: {e}")
    
    return []


async def refresh_all_models() -> None:
    """Обновляет модели всех провайдеров из БД"""
    global _models_cache
    
    print("🔄 Обновление моделей...")
    
    async with AsyncSessionLocal() as db:
        repo = ProviderRepository(db)
        providers = await repo.get_enabled_providers()
        
        if not providers:
            print("   ⚠️ Нет включённых провайдеров")
            state.current_provider = ""
            state.current_model = ""
            return
        
        enabled_providers_info = []
        
        for provider in providers:
            models = await fetch_provider_models(provider)
            
            # Сохраняем модели в БД
            if models:
                await repo.ensure_models_exist(provider.id, models)
            
            # Фильтруем по разрешённым
            allowed_models_db = await repo.get_allowed_models()
            allowed_names = [m.name for m in allowed_models_db if m.provider_id == provider.id]
            
            # Пока разрешённых нет — показываем все (для удобства)
            if not allowed_names:
                filtered = models
            else:
                filtered = [m for m in models if m in allowed_names]
            
            _models_cache[provider.id] = filtered
            
            print(f"   {provider.name}: {len(filtered)} моделей (включен: {provider.is_enabled})")
            enabled_providers_info.append((provider, filtered))
        
        # Выбираем текущего провайдера
        if not state.current_model or state.current_provider not in [p.id for p, _ in enabled_providers_info]:
            for provider, models in enabled_providers_info:
                if models:
                    state.current_provider = provider.id
                    state.current_model = models[0]
                    break
            else:
                state.current_provider = ""
                state.current_model = ""


async def get_providers_with_models(db: AsyncSession) -> List[Dict]:
    """Возвращает провайдеров с моделями (для API)"""
    repo = ProviderRepository(db)
    providers = await repo.get_enabled_providers()
    
    result = []
    for p in providers:
        models = _models_cache.get(p.id, [])
        result.append({
            "id": p.id,
            "name": p.name,
            "api_type": p.api_type,
            "models": models,
            "available": len(models) > 0,
            "current": p.id == state.current_provider,
        })
    
    return result