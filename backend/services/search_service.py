# backend/services/search_service.py
"""Сервис поиска с фильтрацией по программе"""
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from database import collection_exists, search_in_collection
from embeddings import get_docs_embedding, get_ticket_embedding
from config import QDRANT_COLLECTIONS, SEARCH_LIMITS
from db.repositories import SettingsRepository


async def search_all(
    query: str,
    program: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> List[Dict]:
    """
    Гибридный поиск.
    
    Настройки (use_tickets, use_documentation) читаются из БД если передана сессия.
    """
    results = []
    
    # Получаем настройки контекста из БД
    use_tickets = True
    use_documentation = True
    
    if db:
        try:
            settings_repo = SettingsRepository(db)
            ctx = await settings_repo.get_context_settings()
            use_tickets = ctx.use_tickets
            use_documentation = ctx.use_documentation
        except Exception as e:
            print(f"⚠️ Не удалось получить настройки контекста: {e}")
    
    print(f"⚙️ Настройки: tickets={use_tickets}, docs={use_documentation}")
    
    collections_to_search = {}
    
    # Заявки — только если включены
    if use_tickets:
        collections_to_search["tickets"] = QDRANT_COLLECTIONS.get("tickets")
    
    # Документация — только если включена
    if use_documentation:
        if program == "intellect":
            collections_to_search["parts_intellect"] = QDRANT_COLLECTIONS.get("parts_intellect")
        elif program == "resource":
            collections_to_search["parts_resource"] = QDRANT_COLLECTIONS.get("parts_resource")
        else:
            collections_to_search["parts_intellect"] = QDRANT_COLLECTIONS.get("parts_intellect")
            collections_to_search["parts_resource"] = QDRANT_COLLECTIONS.get("parts_resource")
    
    print(f"🔍 Коллекции: {list(collections_to_search.keys())}")
    
    # Векторизуем
    docs_vector = get_docs_embedding(query)
    tickets_vector = await get_ticket_embedding(query)
    
    for collection_type, collection_name in collections_to_search.items():
        if not collection_name:
            continue
        
        if not collection_exists(collection_name):
            print(f"⚠️ Коллекция {collection_name} не найдена")
            continue
        
        vector = tickets_vector if collection_type == "tickets" else docs_vector
        limit = SEARCH_LIMITS.get(collection_type, 10)
        
        points = search_in_collection(collection_name, vector, limit)
        
        for p in points:
            result = _process_point(collection_type, p)
            if result:
                results.append(result)
    
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    tickets = sum(1 for r in results if r.get("type") == "ticket")
    docs = sum(1 for r in results if r.get("type") == "documentation")
    print(f"✅ Итого: {tickets} заявок + {docs} документации")
    
    return results


def _process_point(collection_type: str, point) -> Dict:
    """Преобразует точку Qdrant в результат"""
    payload = point.payload if hasattr(point, 'payload') else {}
    score = point.score if hasattr(point, 'score') else 0
    
    if collection_type == "tickets":
        filename = payload.get("filename", "")
        url = f"https://dokuwiki.tradesoft.ru/tickets:{filename.replace('.txt', '')}" if filename else ""
        
        return {
            "type": "ticket",
            "collection": "tickets",
            "header": payload.get("header", ""),
            "question": payload.get("question", ""),
            "answer": payload.get("answer", ""),
            "author": payload.get("author", ""),
            "source_date": payload.get("source_date", ""),
            "keywords": payload.get("keywords", []),
            "filename": filename,
            "url": url,
            "score": score
        }
    else:
        return {
            "type": "documentation",
            "collection": collection_type,
            "title": payload.get("page_title", payload.get("title", "")),
            "h1": payload.get("h1", ""),
            "url": payload.get("url", ""),
            "content": payload.get("content", ""),
            "score": score
        }