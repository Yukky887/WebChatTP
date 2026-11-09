"""/api/search — прямой поиск по базе знаний без LLM.

Клиентский (гостевой/пользовательский) сценарий — поиск по всем включённым
в админке коллекциям. Для API-токена (X-API-Key / Bearer wcb_...) —
только по заданным для токена скоупам.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from models import SearchRequest
from services.search_service import search_all
from db.session import get_db
from db.models import ApiToken
from dependencies.auth import get_api_token

router = APIRouter(prefix="/api", tags=["Клиент · поиск"])


@router.post("/search")
async def search(
    request: SearchRequest,
    api_token: Optional[ApiToken] = Depends(get_api_token),
    db: AsyncSession = Depends(get_db),
):
    allowed = api_token.scopes if api_token else None
    results = await search_all(request.query, allowed_collections=allowed, db=db)
    return {
        "query": request.query,
        "results": results,
        "total": len(results),
        "tickets_count": sum(1 for r in results if r.get("type") == "ticket"),
        "docs_count": sum(1 for r in results if r.get("type") == "documentation")
    }