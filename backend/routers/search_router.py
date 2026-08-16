from fastapi import APIRouter
from models import SearchRequest
from services.search_service import search_all

router = APIRouter(prefix="/api", tags=["search"])

@router.post("/search")
async def search(request: SearchRequest):
    results = await search_all(request.query)
    return {
        "query": request.query,
        "results": results,
        "total": len(results),
        "tickets_count": sum(1 for r in results if r.get("type") == "ticket"),
        "docs_count": sum(1 for r in results if r.get("type") == "documentation")
    }