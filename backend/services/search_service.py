from typing import List, Dict
from database import collection_exists, search_in_collection
from embeddings import get_docs_embedding, get_ticket_embedding
from config import QDRANT_COLLECTIONS, SEARCH_LIMITS

async def search_all(query: str) -> List[Dict]:
    """Гибридный поиск по всем коллекциям"""
    results = []
    
    # Векторизуем запрос
    docs_vector = get_docs_embedding(query)
    tickets_vector = await get_ticket_embedding(query)
    
    for collection_type, collection_name in QDRANT_COLLECTIONS.items():
        if not collection_exists(collection_name):
            continue
        
        # Выбираем правильный вектор
        vector = tickets_vector if collection_type == "tickets" else docs_vector
        limit = SEARCH_LIMITS.get(collection_type, 5)
        
        points = search_in_collection(collection_name, vector, limit)
        
        for p in points:
            result = _process_point(collection_type, p)
            if result:
                results.append(result)
    
    # Сортируем по score
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return results

def _process_point(collection_type: str, point) -> Dict:
    """Преобразует точку Qdrant в словарь результата"""
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