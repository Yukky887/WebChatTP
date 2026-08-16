from sentence_transformers import SentenceTransformer
import httpx
from typing import List
from config import EMBEDDING_DOCS_MODEL, EMBEDDING_TICKETS

# Модель для документации (локальная, 768d)
docs_model = SentenceTransformer(EMBEDDING_DOCS_MODEL)

# HTTP клиент для эмбеддингов заявок (RouterAI)
ticket_client = httpx.AsyncClient(
    base_url="https://routerai.ru/api/v1",
    timeout=30.0,
    headers={"Authorization": f"Bearer {EMBEDDING_TICKETS['api_key']}"}
)

def get_docs_embedding(text: str) -> List[float]:
    """Эмбеддинг для документации (768d)"""
    return docs_model.encode(text).tolist()

async def get_ticket_embedding(text: str) -> List[float]:
    """Эмбеддинг для заявок ТП (2560d через RouterAI)"""
    try:
        response = await ticket_client.post("/embeddings", json={
            "model": EMBEDDING_TICKETS["model"],
            "input": text[:8000]
        })
        if response.status_code == 200:
            data = response.json()
            return data["data"][0]["embedding"]
    except Exception as e:
        print(f"⚠️ Ticket embedding error: {e}")
    
    # Fallback: padding от локальной модели
    vec = docs_model.encode(text).tolist()
    target_dim = EMBEDDING_TICKETS.get("dimension", 2560)
    return vec + [0.0] * (target_dim - len(vec))