from typing import Dict, List, Optional
import uuid
from services.search_service import search_all
from llm_providers import chat_completion

# Сессии чата
chat_sessions: Dict[str, Dict] = {}

# Ключевые слова для определения программы
PROGRAM_KEYWORDS = {
    "intellect": [
        "parts.intellect"
    ],
    "resource": [
        "parts.resource"
    ]
}

class QuestionClassifier:
    """Классификатор вопросов"""
    
    def classify(self, question: str) -> Optional[str]:
        """Определяет программу по ключевым словам"""
        q = question.lower()
        
        intellect_score = sum(1 for kw in PROGRAM_KEYWORDS["intellect"] if kw in q)
        resource_score = sum(1 for kw in PROGRAM_KEYWORDS["resource"] if kw in q)
        
        if intellect_score > resource_score and intellect_score > 0:
            return "intellect"
        if resource_score > intellect_score and resource_score > 0:
            return "resource"
        
        return None

classifier = QuestionClassifier()

def truncate_content(content: str, max_length: int = 4000) -> str:
    """Умная обрезка — сохраняет начало и конец"""
    if len(content) <= max_length:
        return content
    
    first_part = int(max_length * 0.7)  # 70% начала
    last_part = max_length - first_part  # 30% конца
    
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
) -> Dict:
    """
    Вся логика здесь:
    1. Определяет программу
    2. Если не определена — запрашивает выбор
    3. Ищет в нужной коллекции
    4. Формирует контекст
    5. Запрашивает LLM
    """
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {
            "messages": [],
            "last_program": None,
        }
    
    session = chat_sessions[session_id]
    
    # ========== ШАГ 1: ОПРЕДЕЛЯЕМ ПРОГРАММУ ==========
    if program:
        # Пользователь явно выбрал (кнопка)
        detected_program = program
    else:
        # Классифицируем по словам
        detected_program = classifier.classify(message)
    
    # ========== ШАГ 2: ЕСЛИ НЕ ОПРЕДЕЛИЛИ — СПРАШИВАЕМ ==========
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
    
    # ========== ШАГ 3: ПОИСК В НУЖНОЙ КОЛЛЕКЦИИ ==========
    print(f"🔍 [{detected_program}] Поиск: {message[:50]}...")
    search_results = await search_all(message, program=detected_program)
    
    tickets = [r for r in search_results if r.get("type") == "ticket"][:10]
    docs = [r for r in search_results if r.get("type") == "documentation"][:10]
    
    # ========== ШАГ 4: ФОРМИРУЕМ КОНТЕКСТ ==========
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
                "score": t.get("score", 0),
                "content_length": len(t.get("answer", ""))
            })
    
    if docs:
        context_parts.append("\n### 📚 Документация:\n")
        for i, d in enumerate(docs):
            content = d.get("content", "")
            context_parts.append(
                f"[Док {i+1}] {d.get('title', '')}\n"
                f"{truncate_content(content, 15000)}"  # ← Увеличено
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
    print(f"📊 Контекст: {len(context_text)} символов")
    print(f"   Заявки: {sum(len(t.get('answer', '')) for t in tickets)} симв.")
    print(f"   Документация: {sum(len(d.get('content', '')) for d in docs)} симв.")
    program_name = "Parts.Intellect" if detected_program == "intellect" else "Parts.Resource"
    
    # ========== ШАГ 5: СИСТЕМНЫЙ ПРОМПТ ==========
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
    
    # ========== ШАГ 6: ЗАПРОС К LLM ==========
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
        "has_questions": False,
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