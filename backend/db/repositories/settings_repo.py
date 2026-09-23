"""Репозиторий для настроек"""
from typing import Optional, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import LLMSettings, ContextSettings


class SettingsRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_llm_settings(self) -> LLMSettings:
        """Получает активные настройки LLM"""
        result = await self.db.execute(
            select(LLMSettings).where(LLMSettings.is_active == True).limit(1)
        )
        settings = result.scalar_one_or_none()
        if not settings:
            # Создаём дефолтные
            settings = LLMSettings(
                temperature=0.5,
                top_p=0.9,
                repeat_penalty=1.1,
                max_tokens=8000,
                num_ctx=8192,
            )
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def update_llm_settings(self, **kwargs) -> LLMSettings:
        """Обновляет настройки LLM"""
        settings = await self.get_llm_settings()
        for key, value in kwargs.items():
            if hasattr(settings, key) and value is not None:
                setattr(settings, key, value)
        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def get_context_settings(self) -> ContextSettings:
        """Получает настройки контекста"""
        result = await self.db.execute(
            select(ContextSettings).limit(1)
        )
        settings = result.scalar_one_or_none()
        if not settings:
            settings = ContextSettings(
                use_tickets=True,
                use_documentation=True,
                tickets_limit=5,
                docs_limit=5,
            )
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)
        return settings

    async def update_context_settings(
        self,
        use_tickets: Optional[bool] = None,
        use_documentation: Optional[bool] = None,
    ) -> ContextSettings:
        """Обновляет настройки контекста"""
        settings = await self.get_context_settings()
        if use_tickets is not None:
            settings.use_tickets = use_tickets
        if use_documentation is not None:
            settings.use_documentation = use_documentation
        await self.db.commit()
        await self.db.refresh(settings)
        return settings