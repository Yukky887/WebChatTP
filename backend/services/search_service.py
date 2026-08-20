from typing import List, Dict, Optional
from database import collection_exists, search_in_collection
from embeddings import get_docs_embedding, get_ticket_embedding
from config import QDRANT_COLLECTIONS, SEARCH_LIMITS

async def search_all(query: str, program: Optional[str] = None) -> List[Dict]:
    """
    Гибридный поиск.
    
    - Заявки (TsSpKb) — ВСЕГДА ищем, без фильтрации
    - Документация — только из коллекции выбранной программы
    """
    results = []
    
    # Определяем какие коллекции использовать
    collections_to_search = {}
    
    # Заявки ВСЕГДА ищем (общие для обеих программ)
    collections_to_search["tickets"] = QDRANT_COLLECTIONS.get("tickets")
    
    # Документация — только нужной программы
    if program == "intellect":
        collections_to_search["parts_intellect"] = QDRANT_COLLECTIONS.get("parts_intellect")
        print(f"🔍 [Intellect] TsSpKb + PartsIntellect")
    elif program == "resource":
        collections_to_search["parts_resource"] = QDRANT_COLLECTIONS.get("parts_resource")
        print(f"🔍 [Resource] TsSpKb + PartsResource")
    else:
        # Если программа не указана — ищем во всех
        collections_to_search["parts_intellect"] = QDRANT_COLLECTIONS.get("parts_intellect")
        collections_to_search["parts_resource"] = QDRANT_COLLECTIONS.get("parts_resource")
        print(f"🔍 [All] TsSpKb + PartsIntellect + PartsResource")
    
    # Векторизуем запрос
    docs_vector = get_docs_embedding(query)
    tickets_vector = await get_ticket_embedding(query)
    
    for collection_type, collection_name in collections_to_search.items():
        if not collection_name:
            print(f"⚠️ Коллекция для {collection_type} не настроена")
            continue
        
        if not collection_exists(collection_name):
            print(f"⚠️ Коллекция {collection_name} не найдена")
            continue
        
        # Выбираем вектор
        vector = tickets_vector if collection_type == "tickets" else docs_vector
        limit = SEARCH_LIMITS.get(collection_type, 5)
        
        print(f"   Поиск в {collection_name} (limit={limit})...")
        points = search_in_collection(collection_name, vector, limit)
        print(f"   Найдено: {len(points)}")
        
        for p in points:
            result = _process_point(collection_type, p)
            if result:
                results.append(result)
    
    # Сортируем
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    tickets_count = sum(1 for r in results if r.get("type") == "ticket")
    docs_count = sum(1 for r in results if r.get("type") == "documentation")
    print(f"✅ Итого: {tickets_count} заявок + {docs_count} документации")
    
    return results

def _process_point(collection_type: str, point) -> Dict:
    """Преобразует точку Qdrant в результат (БЕЗ фильтрации)"""
    payload = point.payload if hasattr(point, 'payload') else {}
    score = point.score if hasattr(point, 'score') else 0
    
    if collection_type == "tickets":
        return {
            "type": "ticket",
            "collection": "tickets",
            "header": payload.get("header", ""),
            "question": payload.get("question", ""),
            "answer": payload.get("answer", ""),
            "author": payload.get("author", ""),
            "source_date": payload.get("source_date", ""),
            "keywords": payload.get("keywords", []),
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