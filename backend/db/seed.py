# backend/db/seed.py
"""Заполнение БД начальными данными при первом запуске"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import LLMProvider, LLMSettings, ContextSettings, Program, ProgramKeyword
from config import OLLAMA_URL, LLAMACPP_URL, ROUTERAI_URL, ROUTERAI_API_KEY


async def seed_database(db: AsyncSession) -> None:
    """Заполняет БД начальными данными если пусто"""
    
    # ========== ПРОВАЙДЕРЫ ==========
    result = await db.execute(select(LLMProvider))
    if not result.scalars().first():
        print("🌱 Seeding llm_providers...")
        providers = [
            LLMProvider(
                id="ollama",
                name="Ollama (локальный)",
                base_url=OLLAMA_URL,
                api_type="ollama",
                is_enabled=False,
                priority=1,
            ),
            LLMProvider(
                id="llamacpp",
                name="llama.cpp (Gemma)",
                base_url=LLAMACPP_URL,
                api_type="openai",
                is_enabled=True,
                priority=2,
            ),
            LLMProvider(
                id="routerai",
                name="RouterAI (облачный)",
                base_url=ROUTERAI_URL,
                api_type="openai",
                api_key_encrypted=ROUTERAI_API_KEY,
                is_enabled=False,
                priority=3,
            ),
        ]
        for p in providers:
            db.add(p)
        print(f"   ✅ Добавлено {len(providers)} провайдеров")
    
    # ========== НАСТРОЙКИ LLM ==========
    result = await db.execute(select(LLMSettings))
    if not result.scalars().first():
        print("🌱 Seeding llm_settings...")
        db.add(LLMSettings(
            temperature=0.5,
            top_p=0.9,
            repeat_penalty=1.1,
            max_tokens=8000,
            num_ctx=8192,
            system_prompt_template="""Ты - ассистент по {program_name}.

КОНТЕКСТ:
{context_text}

Правила:
1. Отвечай только по {program_name}
2. Используй заявки ТП как приоритет
3. Документация дополняет
4. Если информации недостаточно — скажи об этом
""",
            is_active=True,
        ))
        print("   ✅ Настройки LLM добавлены")
    
    # ========== НАСТРОЙКИ КОНТЕКСТА ==========
    result = await db.execute(select(ContextSettings))
    if not result.scalars().first():
        print("🌱 Seeding context_settings...")
        db.add(ContextSettings(
            use_tickets=True,
            use_documentation=True,
            tickets_limit=5,
            docs_limit=5,
        ))
        print("   ✅ Настройки контекста добавлены")
    
    # ========== ПРОГРАММЫ ==========
    result = await db.execute(select(Program))
    if not result.scalars().first():
        print("🌱 Seeding programs...")
        programs = [
            Program(
                id="intellect",
                name="Parts.Intellect",
                description="Управление магазином автозапчастей",
                qdrant_collection="PartsIntellect",
            ),
            Program(
                id="resource",
                name="Parts.Resource",
                description="Подбор запчастей",
                qdrant_collection="PartsResource",
            ),
        ]
        for p in programs:
            db.add(p)
        
        # Ключевые слова
        keywords = [
            ProgramKeyword(program_id="intellect", keyword="parts.intellect", weight=5),
            ProgramKeyword(program_id="intellect", keyword="интеллект", weight=5),
            ProgramKeyword(program_id="resource", keyword="parts.resource", weight=5),
            ProgramKeyword(program_id="resource", keyword="ресурс", weight=5),
        ]
        for k in keywords:
            db.add(k)
        print(f"   ✅ Добавлено {len(programs)} программ и {len(keywords)} ключевых слов")
    
    await db.commit()
    print("✅ Seed завершён")