from qdrant_client import QdrantClient
from typing import List
from config import QDRANT_URL

qdrant_client = QdrantClient(url=QDRANT_URL)

def get_existing_collections() -> List[str]:
    """Возвращает список существующих коллекций"""
    try:
        collections = qdrant_client.get_collections()
        return [c.name for c in collections.collections]
    except Exception as e:
        print(f"⚠️ Qdrant error: {e}")
        return []

def collection_exists(name: str) -> bool:
    """Проверяет существование коллекции"""
    return name in get_existing_collections()

def search_in_collection(collection_name: str, vector: List[float], limit: int = 5):
    """Поиск в коллекции с fallback на старый API"""
    try:
        r = qdrant_client.query_points(
            collection_name=collection_name,
            query=vector,
            limit=limit
        )
        return r.points
    except AttributeError:
        return qdrant_client.search(
            collection_name=collection_name,
            query_vector=vector,
            limit=limit
        )
    except Exception as e:
        print(f"⚠️ Search error in {collection_name}: {e}")
        return []