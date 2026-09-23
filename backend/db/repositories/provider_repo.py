"""Репозиторий для провайдеров и моделей"""
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import LLMProvider, LLMModel


class ProviderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all_providers(self) -> List[LLMProvider]:
        """Все провайдеры"""
        result = await self.db.execute(
            select(LLMProvider).order_by(LLMProvider.priority)
        )
        return list(result.scalars().all())

    async def get_enabled_providers(self) -> List[LLMProvider]:
        """Только включённые провайдеры"""
        result = await self.db.execute(
            select(LLMProvider)
            .where(LLMProvider.is_enabled == True)
            .order_by(LLMProvider.priority)
        )
        return list(result.scalars().all())

    async def toggle_provider(self, provider_id: str, enabled: bool) -> Optional[LLMProvider]:
        """Включает/выключает провайдера"""
        result = await self.db.execute(
            select(LLMProvider).where(LLMProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if provider:
            provider.is_enabled = enabled
            await self.db.commit()
            await self.db.refresh(provider)
        return provider

    async def set_api_key(self, provider_id: str, api_key: str) -> Optional[LLMProvider]:
        """Устанавливает API ключ"""
        result = await self.db.execute(
            select(LLMProvider).where(LLMProvider.id == provider_id)
        )
        provider = result.scalar_one_or_none()
        if provider:
            provider.api_key_encrypted = api_key
            await self.db.commit()
            await self.db.refresh(provider)
        return provider

    async def get_allowed_models(self) -> List[LLMModel]:
        """Разрешённые модели"""
        result = await self.db.execute(
            select(LLMModel).where(LLMModel.is_allowed == True)
        )
        return list(result.scalars().all())

    async def get_favorite_models(self) -> List[LLMModel]:
        """Избранные модели"""
        result = await self.db.execute(
            select(LLMModel).where(LLMModel.is_favorite == True)
        )
        return list(result.scalars().all())

    async def update_allowed_models(
        self,
        allowed_names: List[str],
        favorite_names: List[str],
    ) -> None:
        """Обновляет белый список моделей"""
        # Сбрасываем все
        result = await self.db.execute(select(LLMModel))
        all_models = list(result.scalars().all())

        for model in all_models:
            model.is_allowed = model.name in allowed_names
            model.is_favorite = model.name in favorite_names

        await self.db.commit()

    async def ensure_models_exist(
        self,
        provider_id: str,
        model_names: List[str],
    ) -> None:
        """Создаёт модели если их нет"""
        result = await self.db.execute(
            select(LLMModel).where(LLMModel.provider_id == provider_id)
        )
        existing = {m.name for m in result.scalars().all()}

        for name in model_names:
            if name not in existing:
                self.db.add(LLMModel(
                    provider_id=provider_id,
                    name=name,
                ))

        await self.db.commit()