"""Сервис чата"""
from typing import Dict, List
import uuid
from services.search_service import search_all
from llm_providers import chat_completion
from config import llm_settings

# Сессии чата
chat_sessions: Dict[str, Dict] = {}

def format_history(messages: List[Dict]) -> str:
    """Форматирует историю диалога"""
    if not messages:
        return "Нет предыдущих сообщений."
    parts = []
    for msg in messages:
        role = "👤" if msg["role"] == "user" else "🤖"
        parts.append(f"{role}: {msg['content'][:300]}")
    return "\n".join(parts)

def build_context(search_results: List[Dict]) -> tuple[str, List[Dict]]:
    """Формирует контекст для LLM из результатов поиска"""
    tickets = [r for r in search_results if r.get("type") == "ticket"][:5]
    docs = [r for r in search_results if r.get("type") == "documentation"][:5]
    
    context_parts = []
    sources = []
    
    # Заявки ТП
    if tickets:
        context_parts.append("### 📋 Решенные заявки ТП:\n")
        for i, t in enumerate(tickets):
            header = t.get("header", "Без темы")
            question = (t.get("question") or "")[:500]
            answer_tp = (t.get("answer") or "")[:1500]
            author = t.get("author", "")
            date = t.get("source_date", "")
            
            context_parts.append(
                f"[Заявка {i+1} | {t.get('score', 0):.2f}]\n"
                f"Тема: {header}\n"
                f"Вопрос: {question}\n"
                f"Ответ: {answer_tp}\n"
                f"Автор: {author} | {date}"
            )
            
            sources.append({
                "index": i + 1,
                "type": "ticket",
                "title": header,
                "author": author,
                "date": date,
                "score": t.get("score", 0),
                "content_length": len(answer_tp)
            })
    
    # Документация
    if docs:
        context_parts.append("\n### 📚 Документация:\n")
        for i, d in enumerate(docs):
            content = (d.get("content") or "")[:1500]
            
            context_parts.append(
                f"[Док {i+1} | {d.get('score', 0):.2f}]\n"
                f"Раздел: {d.get('title', '')}\n"
                f"Ссылка: {d.get('url', '')}\n"
                f"Содержание: {content}"
            )
            
            sources.append({
                "index": len(tickets) + i + 1,
                "type": "documentation",
                "title": d.get("title", ""),
                "url": d.get("url", ""),
                "score": d.get("score", 0),
                "content_length": len(content)
            })
    
    return "\n\n".join(context_parts), sources

async def process_chat(message: str, provider: str, model: str, session_id: str = None) -> Dict:
    """Обрабатывает сообщение чата"""
    
    # Создаем сессию
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if session_id not in chat_sessions:
        chat_sessions[session_id] = {"messages": []}
    
    session = chat_sessions[session_id]
    
    # Поиск контекста
    search_query = message
    if session["messages"]:
        recent = " ".join([m["content"][:200] for m in session["messages"][-3:] if m["role"] == "user"])
        if recent:
            search_query = f"{recent} {message}"
    
    search_results = await search_all(search_query)
    
    # Формируем контекст
    context_text, sources = build_context(search_results)
    
    # Системный промпт
    system_prompt = f"""Ты - ассистент техподдержки по Parts.Intellect и Parts.Resource.

КОНТЕКСТ:
{context_text}

ПРАВИЛА:
1. ПРИОРИТЕТ: Заявки ТП содержат реальные решения.
2. Документация дополняет инструкциями.
3. Указывай источники.

ИСТОРИЯ:
{format_history(session["messages"][-6:])}
"""
    
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(session["messages"][-10:])
    messages.append({"role": "user", "content": message})
    
    session["messages"].append({"role": "user", "content": message})
    
    # Запрос к LLM
    result = await chat_completion(provider, model, messages)
    answer = result["content"]
    
    # Добавляем источники
    if sources and "📚" not in answer:
        st = "\n\n---\n📚 **Источники:**\n"
        for s in sources:
            if s["type"] == "ticket":
                st += f"- [Заявка {s['index']}] {s['title']}\n"
            else:
                st += f"- [Док {s['index']}] [{s['title']}]({s['url']})\n"
        answer += st
    
    session["messages"].append({"role": "assistant", "content": answer})
    
    return {
        "session_id": session_id,
        "answer": answer,
        "sources": sources,
        "usage": result.get("usage", {}),
        "has_questions": "🤔" in answer,
        "suggestions": []
    }