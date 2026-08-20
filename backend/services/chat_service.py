from typing import Dict, List, Optional
import uuid
from services.search_service import search_all
from llm_providers import chat_completion
from config import llm_settings

chat_sessions: Dict[str, Dict] = {}

PROGRAM_KEYWORDS = {
    "intellect": [
        "parts.intellect", "parts intellect", "интеллект"
    ],
    "resource": [
        "parts.resource", "parts resource", "ресурс"
    ]
}

class QuestionClassifier:
    """Классификатор вопросов"""
    
    def classify(self, question: str) -> Optional[str]:
        """Определяет программу по ключевым словам"""
        q = question.lower()
        
        # Явное указание
        if "parts.intellect" in q or "интеллект" in q:
            return "intellect"
        if "parts.resource" in q or "ресурс" in q:
            return "resource"
        
        intellect_score = sum(1 for kw in PROGRAM_KEYWORDS["intellect"] if kw in q)
        resource_score = sum(1 for kw in PROGRAM_KEYWORDS["resource"] if kw in q)
        
        if intellect_score > resource_score and intellect_score >= 1:
            return "intellect"
        if resource_score > intellect_score and resource_score >= 1:
            return "resource"
        
        return None

classifier = QuestionClassifier()

async def process_chat(
    message: str,
    provider: str,
    model: str,
    session_id: str = None,
    program: Optional[str] = None,
) -> Dict:
    """
    Обрабатывает сообщение чата.
    
    Порядок:
    1. Определяем программу (из аргумента, сессии, или классификатора)
    2. Если программа не определена — спрашиваем пользователя
    3. Ищем контекст ТОЛЬКО в нужной коллекции
    4. Отправляем LLM
    """
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "messages": [],
            "program": None,
        }
    
    session = chat_sessions[session_id]
    
    # Шаг 1: Определяем программу
    detected_program = program or session.get("program") or classifier.classify(message)
    
    # Если программа определена — сохраняем в сессии
    if detected_program:
        session["program"] = detected_program
    
    # Шаг 2: Если программа не определена — просим уточнить
    if not detected_program:
        return {
            "session_id": session_id,
            "answer": "🤔 Уточните, о какой программе ваш вопрос?",
            "has_questions": True,
            "suggestions": ["Parts.Intellect", "Parts.Resource"],
            "sources": [],
            "provider": provider,
            "model": model,
            "truncated": False,
            "usage": {},
            "program": None,
            "needs_program_selection": True
        }
    
    # Шаг 3: Поиск ТОЛЬКО в нужной коллекции
    print(f"🔍 [{detected_program}] Поиск: {message[:50]}...")
    search_results = await search_all(message, program=detected_program)
    
    print(f"📊 Всего результатов: {len(search_results)}")
    for r in search_results:
        print(f"   - type={r.get('type')}, collection={r.get('collection')}, title={r.get('title', r.get('header', ''))[:50]}")

    tickets = [r for r in search_results if r.get("type") == "ticket"][:5]
    docs = [r for r in search_results if r.get("type") == "documentation"][:5]
    
    # Формируем контекст
    context_parts = []
    sources = []
    
    if tickets:
        context_parts.append("### 📋 Заявки ТП:\n")
        for i, t in enumerate(tickets):
            context_parts.append(
                f"[Заявка {i+1}] {t.get('header', '')}\n"
                f"Q: {t.get('question', '')[:500]}\n"
                f"A: {t.get('answer', '')[:1500]}"
            )
            sources.append({
                "index": i + 1,
                "type": "ticket",
                "title": t.get("header", ""),
                "score": t.get("score", 0),
                "content_length": len(t.get("answer", ""))
            })
    
    if docs:
        context_parts.append("\n### 📚 Документация:\n")
        for i, d in enumerate(docs):
            context_parts.append(
                f"[Док {i+1}] {d.get('title', '')}\n"
                f"{d.get('content', '')[:1500]}"
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
    
    # Системный промпт
    system_prompt = f"""Ты - ассистент по {program_name}.

КОНТЕКСТ (только {program_name}):
{context_text}

Правила:
1. Отвечай только по {program_name}
2. Используй заявки ТП как приоритет
3. Документация дополняет
4. Если информации недостаточно — скажи об этом

История:
{format_history(session["messages"][-6:])}
"""
    
    # Шаг 4: Запрос к LLM
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(session["messages"][-10:])
    messages.append({"role": "user", "content": message})
    
    session["messages"].append({"role": "user", "content": message})
    
    result = await chat_completion(provider, model, messages)
    answer = result["content"]
    
    session["messages"].append({"role": "assistant", "content": answer})
    
    print(f"✅ [{detected_program}] {len(tickets)} заявок + {len(docs)} доков → {len(answer)} символов")
    
    return {
        "session_id": session_id,
        "answer": answer,
        "has_questions": "🤔" in answer,
        "suggestions": [],
        "sources": sources,
        "provider": provider,
        "model": model,
        "truncated": "⚠️" in answer,
        "usage": result.get("usage", {}),
        "program": detected_program,
        "needs_program_selection": False
    }

def format_history(messages: List[Dict]) -> str:
    if not messages:
        return "Нет"
    parts = []
    for msg in messages:
        role = "👤" if msg["role"] == "user" else "🤖"
        parts.append(f"{role}: {msg['content'][:200]}")
    return "\n".join(parts)