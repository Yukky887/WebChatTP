# backend/services/provider_service.py
"""Сервис провайдеров и моделей (работает через БД)"""
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories import ProviderRepository


async def get_all_providers(db: AsyncSession) -> List[Dict]:
    """Получает всех провайдеров"""
    repo = ProviderRepository(db)
    providers = await repo.get_all_providers()
    return [
        {
            "id": p.id,
            "name": p.name,
            "base_url": p.base_url,
            "api_type": p.api_type,
            "is_enabled": p.is_enabled,
            "priority": p.priority,
            "api_key_set": bool(p.api_key_encrypted),
        }
        for p in providers
    ]


async def get_enabled_providers(db: AsyncSession) -> List[Dict]:
    """Только включённые"""
    repo = ProviderRepository(db)
    providers = await repo.get_enabled_providers()
    return [
        {
            "id": p.id,
            "name": p.name,
            "base_url": p.base_url,
            "api_type": p.api_type,
        }
        for p in providers
    ]


async def toggle_provider(db: AsyncSession, provider_id: str, enabled: bool) -> Optional[Dict]:
    """Включает/выключает провайдера"""
    repo = ProviderRepository(db)
    provider = await repo.toggle_provider(provider_id, enabled)
    if not provider:
        return None
    return {"provider": provider.id, "enabled": provider.is_enabled}


async def set_api_key(db: AsyncSession, provider_id: str, api_key: str) -> Optional[Dict]:
    """Устанавливает API ключ"""
    repo = ProviderRepository(db)
    provider = await repo.set_api_key(provider_id, api_key)
    if not provider:
        return None
    return {"status": "ok", "provider": provider.id}