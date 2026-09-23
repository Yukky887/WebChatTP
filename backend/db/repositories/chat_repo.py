from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import ChatSession, Message, MessageSource, MessageUsage


class ChatRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self,
        session_id: Optional[UUID] = None,
        user_id: Optional[int] = None,
        provider_id: Optional[str] = None,
        model_id: Optional[int] = None,
        selected_program: Optional[str] = None,
    ) -> ChatSession:
        """Создаёт новую сессию чата"""
        session = ChatSession(
            id=session_id,
            user_id=user_id,
            provider_id=provider_id,
            model_id=model_id,
            selected_program=selected_program,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_session(self, session_id: UUID) -> Optional[ChatSession]:
        """Получает сессию по ID"""
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_or_create_session(
        self,
        session_id: Optional[UUID] = None,
        **kwargs
    ) -> ChatSession:
        """Получает или создаёт сессию"""
        if session_id:
            session = await self.get_session(session_id)
            if session:
                return session
        return await self.create_session(session_id=session_id, **kwargs)

    async def add_message(
        self,
        session_id: UUID,
        role: str,
        content: str,
        program_id: Optional[str] = None,
        sources: Optional[List[dict]] = None,
        usage: Optional[dict] = None,
    ) -> Message:
        """Добавляет сообщение в сессию"""
        message = Message(
            session_id=session_id,
            role=role,
            content=content,
            program_id=program_id,
        )
        self.db.add(message)
        await self.db.flush()  # Чтобы получить message.id

        # Добавляем источники
        if sources:
            for idx, src in enumerate(sources):
                self.db.add(MessageSource(
                    message_id=message.id,
                    source_type=src.get('type', 'unknown'),
                    source_title=src.get('title', ''),
                    source_url=src.get('url', ''),
                    qdrant_collection=src.get('collection', ''),
                    qdrant_score=src.get('score', 0),
                    source_index=src.get('index', idx + 1),
                ))

        # Добавляем usage
        if usage:
            self.db.add(MessageUsage(
                message_id=message.id,
                prompt_tokens=usage.get('prompt_tokens', 0),
                completion_tokens=usage.get('completion_tokens', 0),
                total_tokens=usage.get('total_tokens', 0),
                cost=usage.get('cost', 0),
                response_time_ms=usage.get('response_time_ms'),
            ))

        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_session_messages(
        self,
        session_id: UUID,
        limit: int = 10,
    ) -> List[Message]:
        """Получает последние сообщения сессии"""
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        messages = list(result.scalars().all())
        return list(reversed(messages))  # В хронологическом порядке

    async def update_session_program(
        self,
        session_id: UUID,
        program: str,
    ) -> None:
        """Обновляет программу сессии"""
        session = await self.get_session(session_id)
        if session:
            session.selected_program = program
            session.updated_at = datetime.utcnow()
            await self.db.commit()

    async def delete_session(self, session_id: UUID) -> None:
        """Удаляет сессию"""
        session = await self.get_session(session_id)
        if session:
            await self.db.delete(session)
            await self.db.commit()