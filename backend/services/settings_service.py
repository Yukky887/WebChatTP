# backend/services/settings_service.py
"""Сервис настроек (работает через БД)"""
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories import SettingsRepository


async def get_llm_settings(db: AsyncSession) -> Dict:
    """Получает настройки LLM"""
    repo = SettingsRepository(db)
    s = await repo.get_llm_settings()
    return {
        "temperature": float(s.temperature),
        "top_p": float(s.top_p),
        "repeat_penalty": float(s.repeat_penalty),
        "max_tokens": s.max_tokens,
        "num_ctx": s.num_ctx,
        "system_prompt_template": s.system_prompt_template or "",
    }


async def update_llm_settings(
    db: AsyncSession,
    temperature: Optional[float] = None,
    top_p: Optional[float] = None,
    repeat_penalty: Optional[float] = None,
    max_tokens: Optional[int] = None,
    num_ctx: Optional[int] = None,
    system_prompt_template: Optional[str] = None,
) -> Dict:
    """Обновляет настройки LLM"""
    repo = SettingsRepository(db)
    await repo.update_llm_settings(
        temperature=temperature,
        top_p=top_p,
        repeat_penalty=repeat_penalty,
        max_tokens=max_tokens,
        num_ctx=num_ctx,
        system_prompt_template=system_prompt_template,
    )
    return await get_llm_settings(db)


async def get_context_settings(db: AsyncSession) -> Dict:
    """Настройки контекста"""
    repo = SettingsRepository(db)
    s = await repo.get_context_settings()
    return {
        "use_tickets": s.use_tickets,
        "use_documentation": s.use_documentation,
        "tickets_limit": s.tickets_limit,
        "docs_limit": s.docs_limit,
    }


async def update_context_settings(
    db: AsyncSession,
    use_tickets: Optional[bool] = None,
    use_documentation: Optional[bool] = None,
) -> Dict:
    """Обновляет настройки контекста"""
    repo = SettingsRepository(db)
    await repo.update_context_settings(
        use_tickets=use_tickets,
        use_documentation=use_documentation,
    )
    return await get_context_settings(db)