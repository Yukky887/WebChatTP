from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime
from sqlalchemy import select, desc, asc, case, func
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
        api_token_id: Optional[int] = None,
    ) -> ChatSession:
        """Создаёт новую сессию чата"""
        session = ChatSession(
            id=session_id,
            user_id=user_id,
            api_token_id=api_token_id,
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
    ) -> Optional[ChatSession]:
        """Получает или создаёт сессию.

        Возвращает None, если сессия с таким id — чужая: тогда чат продолжится
        в новой сессии, а история другого пользователя не доступна.

        Владение: сессии пользователя — по user_id (api_token_id=None),
        сессии API-токена — по api_token_id (user_id=None). Чуж getS не
        подхватывается ни юзером, ни другим токеном. Сессии без владельца
        (гостевые) приравниваются к обычным анонимным и могут получать
        user_id при перерегистрации юзера (как раньше).
        """
        user_id = kwargs.get("user_id")
        api_token_id = kwargs.get("api_token_id")

        if session_id:
            session = await self.get_session(session_id)
            if session is not None:
                owner_user = session.user_id
                owner_token = session.api_token_id
                # Сессия конкретного юзера недоступна никому другому
                if owner_user is not None and (user_id is None or owner_user != user_id):
                    return None
                # Сессия конкретного токена — только этому токену
                if owner_token is not None and owner_token != api_token_id:
                    return None
                # Гостевые (созданные без владельца) может забрать во владение юзер
                if owner_user is None and owner_token is None and user_id is not None:
                    session.user_id = user_id
                    await self.db.commit()
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

        # Обновляем updated_at сессии — от него зависит сортировка истории
        result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        session = result.scalar_one_or_none()
        if session:
            session.updated_at = datetime.utcnow()

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

    async def set_session_title(self, session_id: UUID, title: str) -> None:
        """Задает название сессии"""
        session = await self.get_session(session_id)
        if session:
            session.title = title[:255]
            await self.db.commit()

    async def delete_session(self, session_id: UUID) -> None:
        """Удаляет сессию"""
        session = await self.get_session(session_id)
        if session:
            await self.db.delete(session)
            await self.db.commit()

    # ---------- Эскалация «бот → живой специалист» ----------

    async def set_session_status(
        self,
        session_id: UUID,
        status: str,
        operator_id: Optional[int] = None,
        clear_operator: bool = False,
        escalated: bool = False,
        closed: bool = False,
    ) -> Optional[ChatSession]:
        """Меняет статус сессии (эскалация).

        operator_id — закрепить оператора; clear_operator — сбросить;
        escalated — проставить escalated_at «позвал спеца»;
        closed — проставить closed_at (переоткрытие сбрасывает его).
        """
        session = await self.get_session(session_id)
        if not session:
            return None
        session.status = status
        if clear_operator:
            session.operator_id = None
        elif operator_id is not None:
            session.operator_id = operator_id
        if escalated:
            session.escalated_at = datetime.utcnow()
        if closed:
            session.closed_at = datetime.utcnow()
        elif status != 'closed':
            session.closed_at = None
        session.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def list_sessions_admin(
        self,
        status: Optional[str] = None,
        token_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[ChatSession]:
        """Список сессий для админки: сначала эскалации, далее по свежести.

        status='escalations' — обе фазы эскалации (waiting_operator +
        operator_active); иначе — точное значение статуса.
        """
        q = select(ChatSession)
        if status:
            if status == 'escalations':
                q = q.where(ChatSession.status.in_(['waiting_operator', 'operator_active']))
            else:
                q = q.where(ChatSession.status == status)
        if token_id:
            q = q.where(ChatSession.api_token_id == token_id)
        priority = case(
            (ChatSession.status.in_(['waiting_operator', 'operator_active']), 0),
            (ChatSession.status == 'active', 1),
            else_=2,
        )
        q = q.order_by(asc(priority), desc(ChatSession.updated_at))
        q = q.limit(limit).offset(offset)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def message_counts(self, session_ids: List[UUID]) -> Dict[UUID, int]:
        """Число сообщений по каждой сессии"""
        if not session_ids:
            return {}
        result = await self.db.execute(
            select(Message.session_id, func.count(Message.id))
            .where(Message.session_id.in_(session_ids))
            .group_by(Message.session_id)
        )
        return {sid: cnt for sid, cnt in result.all()}

    async def last_messages(self, session_ids: List[UUID]) -> Dict[UUID, Message]:
        """Последнее сообщение каждой сессии (для превью в списке)"""
        if not session_ids:
            return {}
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id.in_(session_ids))
            .order_by(
                Message.session_id,
                desc(Message.created_at), desc(Message.id),
            )
            .distinct_on(Message.session_id)
        )
        return {m.session_id: m for m in result.scalars().all()}

    async def get_transcript_messages(
        self, session_id: UUID, limit: int = 500,
    ) -> List[Message]:
        """Полная переписка сессии в хронологическом порядке"""
        result = await self.db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(asc(Message.created_at), asc(Message.id))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def sources_for_messages(
        self, message_ids: List[int],
    ) -> Dict[int, List[MessageSource]]:
        """Источники сообщений, сгруппированные по message_id"""
        if not message_ids:
            return {}
        result = await self.db.execute(
            select(MessageSource)
            .where(MessageSource.message_id.in_(message_ids))
            .order_by(asc(MessageSource.source_index))
        )
        grouped: Dict[int, List[MessageSource]] = {}
        for s in result.scalars().all():
            grouped.setdefault(s.message_id, []).append(s)
        return grouped

    async def usage_for_messages(
        self, message_ids: List[int],
    ) -> Dict[int, MessageUsage]:
        """Usage сообщений, сгруппированный по message_id"""
        if not message_ids:
            return {}
        result = await self.db.execute(
            select(MessageUsage).where(MessageUsage.message_id.in_(message_ids))
        )
        return {u.message_id: u for u in result.scalars().all()}