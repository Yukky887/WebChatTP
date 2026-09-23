from typing import Dict, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession

from services.search_service import search_all
from llm_providers import chat_completion
from db.repositories import ChatRepository
from db.repositories import ProviderRepository


class QuestionClassifier:
    """Классификатор вопросов"""
    
    PROGRAM_KEYWORDS = {
        "intellect": ["parts.intellect", "интеллект"],
        "resource": ["parts.resource", "ресурс"],
    }
    
    def classify(self, question: str) -> Optional[str]:
        q = question.lower()
        intellect_score = sum(1 for kw in self.PROGRAM_KEYWORDS["intellect"] if kw in q)
        resource_score = sum(1 for kw in self.PROGRAM_KEYWORDS["resource"] if kw in q)
        
        if intellect_score > resource_score and intellect_score > 0:
            return "intellect"
        if resource_score > intellect_score and resource_score > 0:
            return "resource"
        return None


classifier = QuestionClassifier()


def truncate_content(content: str, max_length: int = 15000) -> str:
    """Умная обрезка"""
    if len(content) <= max_length:
        return content
    first_part = int(max_length * 0.7)
    last_part = max_length - first_part
    return (
        content[:first_part]
        + f"\n\n... [обрезано {len(content) - max_length} симв.] ...\n\n"
        + content[-last_part:]
    )


async def process_chat(
    message: str,
    provider: str,
    model: str,
    session_id: str = None,
    program: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Optional[AsyncSession] = None,
) -> Dict:
    """
    Обрабатывает сообщение чата с сохранением в БД
    """
    # Работаем с БД если передана сессия
    chat_repo = ChatRepository(db) if db else None
    
    # Парсим UUID сессии
    parsed_session_id = None
    if session_id:
        try:
            parsed_session_id = UUID(session_id)
        except (ValueError, TypeError):
            parsed_session_id = None
    
    # Создаём или получаем сессию в БД
    db_session = None
    if chat_repo:
        db_session = await chat_repo.get_or_create_session(
            session_id=parsed_session_id,
            user_id=user_id,
            provider_id=provider,
        )
        session_id = str(db_session.id)
    
    if not session_id:
        session_id = str(uuid4())
    
    # Загружаем историю из БД
    history = []
    if chat_repo and db_session:
        messages = await chat_repo.get_session_messages(db_session.id, limit=10)
        history = [{"role": m.role, "content": m.content} for m in messages]
    
    # ========== ОПРЕДЕЛЯЕМ ПРОГРАММУ ==========
    if program:
        detected_program = program
    else:
        detected_program = classifier.classify(message)
    
    # Сохраняем вопрос в БД
    if chat_repo and db_session:
        await chat_repo.add_message(
            session_id=db_session.id,
            role="user",
            content=message,
        )
    
    # ========== НЕТ ПРОГРАММЫ ==========
    if not detected_program:
        return {
            "session_id": session_id,
            "answer": "",
            "has_questions": True,
            "suggestions": ["Parts.Intellect", "Parts.Resource"],
            "sources": [],
            "provider": provider,
            "model": model,
            "truncated": False,
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "cost": 0},
            "program": None,
            "needs_program_selection": True
        }
    
    # Обновляем программу в сессии
    if chat_repo and db_session:
        await chat_repo.update_session_program(db_session.id, detected_program)
    
    # ========== ПОИСК ==========
    print(f"🔍 [{detected_program}] Поиск: {message[:50]}...")
    search_results = await search_all(message, program=detected_program, db=db)
    
    tickets = [r for r in search_results if r.get("type") == "ticket"][:10]
    docs = [r for r in search_results if r.get("type") == "documentation"][:10]
    
    # ========== КОНТЕКСТ ==========
    context_parts = []
    sources = []
    
    if tickets:
        context_parts.append("### 📋 Заявки ТП:\n")
        for i, t in enumerate(tickets):
            context_parts.append(
                f"[Заявка {i+1}] {t.get('header', '')}\n"
                f"Q: {t.get('question', '')[:5000]}\n"
                f"A: {t.get('answer', '')[:5000]}"
            )
            sources.append({
                "index": i + 1,
                "type": "ticket",
                "title": t.get("header", ""),
                "url": t.get("url", ""),
                "score": t.get("score", 0),
                "content_length": len(t.get("answer", ""))
            })
    
    if docs:
        context_parts.append("\n### 📚 Документация:\n")
        for i, d in enumerate(docs):
            context_parts.append(
                f"[Док {i+1}] {d.get('title', '')}\n"
                f"{truncate_content(d.get('content', ''))}"
            )
            sources.append({
                "index": len(tickets) + i + 1,
                "type": "documentation",
                "title": d.get("title", ""),
                "url": d.get("url", ""),
                "score": d.get("score", 0),
                "content_length": len(d.get("content", ""))
            })
    
    context_text = "\n\n".join(context_parts) if context_parts else "Контекст не найден."
    program_name = "Parts.Intellect" if detected_program == "intellect" else "Parts.Resource"
    
    # ========== ПРОМПТ ==========
    system_prompt = f"""Ты - ассистент по {program_name}.

КОНТЕКСТ (только {program_name}):
{context_text}

Правила:
1. Отвечай только по {program_name}
2. Используй заявки ТП как приоритет
3. Документация дополняет
4. Если информации недостаточно — скажи об этом
"""
    
    # ========== ЗАПРОС К LLM ==========
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history[-10:])
    messages.append({"role": "user", "content": message})
    
    provider_repo = ProviderRepository(db)
    provider_db = None
    for p in await provider_repo.get_all_providers():
        if p.id == provider:
            provider_db = p
            break

    if not provider_db:
        raise Exception(f"Провайдер {provider} не найден")

    result = await chat_completion(
        provider_id=provider_db.id,
        base_url=provider_db.base_url,
        api_type=provider_db.api_type,
        api_key=provider_db.api_key_encrypted or "",
        model=model,
        messages=messages,
        db=db,
    )
    answer = result["content"]
    usage = result.get("usage", {})
    
    # Сохраняем ответ в БД
    if chat_repo and db_session:
        await chat_repo.add_message(
            session_id=db_session.id,
            role="assistant",
            content=answer,
            program_id=detected_program,
            sources=sources,
            usage=usage,
        )
    
    print(f"✅ [{detected_program}] {len(tickets)} заявок + {len(docs)} доков → {len(answer)} символов")
    
    return {
        "session_id": session_id,
        "answer": answer,
        "has_questions": False,
        "suggestions": [],
        "sources": sources,
        "provider": provider,
        "model": model,
        "truncated": "⚠️" in answer,
        "usage": usage,
        "program": detected_program,
        "needs_program_selection": False
    }