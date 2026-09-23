"""Тест репозиториев"""
import asyncio
from uuid import uuid4
from db.session import AsyncSessionLocal
from db.repositories import ChatRepository, SettingsRepository, ProviderRepository


async def main():
    async with AsyncSessionLocal() as db:
        # Тест настроек
        settings_repo = SettingsRepository(db)
        settings = await settings_repo.get_llm_settings()
        print(f"✅ Настройки LLM: temp={settings.temperature}, max_tokens={settings.max_tokens}")

        # Тест провайдеров
        provider_repo = ProviderRepository(db)
        providers = await provider_repo.get_all_providers()
        print(f"✅ Провайдеров: {len(providers)}")
        for p in providers:
            print(f"   - {p.id}: enabled={p.is_enabled}")

        # Тест чата
        chat_repo = ChatRepository(db)
        session = await chat_repo.create_session(
            session_id=uuid4(),
            provider_id="llamacpp",
            selected_program="intellect",
        )
        print(f"✅ Сессия создана: {session.id}")

        # Добавляем сообщение
        msg = await chat_repo.add_message(
            session_id=session.id,
            role="user",
            content="Тестовый вопрос",
            program_id="intellect",
        )
        print(f"✅ Сообщение добавлено: {msg.id}")

        # Получаем сообщения
        messages = await chat_repo.get_session_messages(session.id)
        print(f"✅ Сообщений в сессии: {len(messages)}")

        # Удаляем тестовую сессию
        await chat_repo.delete_session(session.id)
        print(f"✅ Сессия удалена")


if __name__ == "__main__":
    asyncio.run(main())