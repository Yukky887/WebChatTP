# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from routers import (
    chat_router, search_router, health_router, admin_router, provider_router,
    auth_router, sessions_router, tokens_router
)
from services.model_service import refresh_all_models
from db.session import AsyncSessionLocal
from db.seed import seed_database
from services.state import state


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Запуск сервера...")
    
    async with AsyncSessionLocal() as db:
        await seed_database(db)
    
    await refresh_all_models()
    
    if state.current_model:
        print(f"✅ Провайдер: {state.current_provider}, Модель: {state.current_model}")
    else:
        print("⚠️ Нет активных провайдеров")
    
    yield
    print("👋 Завершение работы...")


app = FastAPI(
    title="Parts AI Assistant",
    version="1.4.0",
    description=(
        "Backend чата по базе знаний.\n\n"
        "Авторизация:\n"
        "— веб-клиент и админка: JWT (`Authorization: Bearer <access_token>`, "
        "получить через `POST /api/auth/login`);\n"
        "— внешние интеграции: API-токен с скоупами (`X-API-Key: wcb_...`, "
        "см. `docs/api-tokens.md`) — для chat/search/sessions.\n\n"
        "Интерактивный Swagger: `/docs`, альтернатива — `/redoc`, JSON-спека — `/openapi.json`."
    ),
    lifespan=lifespan,
)

# ==================== OpenAPI: securitySchemes ====================
# Схемы авторизации для Swagger UI (кнопка «Authorize»):
# помечены роуты, у которых среди зависимостей есть проверки из dependencies/auth.
_OPENAPI_METHODS = ("get", "put", "post", "delete", "patch")


def _auth_kinds(route) -> set:
    """{'jwt', 'token'}: какие проверки авторизации есть среди зависимостей роута."""
    kinds = set()
    stack = list(getattr(getattr(route, "dependant", None), "dependencies", []) or [])
    seen = 0
    while stack and seen < 200:
        seen += 1
        dep = stack.pop()
        call = getattr(dep, "call", None)
        if call is not None and (getattr(call, "__module__", "") or "").endswith("dependencies.auth"):
            name = getattr(call, "__name__", "") or ""
            kinds.add("token" if "api_token" in name else "jwt")
        stack.extend(getattr(dep, "dependencies", []) or [])
    return kinds


def _custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        description=app.description or None,
        version=app.version,
        routes=app.routes,
    )
    schema.setdefault("components", {})["securitySchemes"] = {
        "BearerJWT": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT",
                      "description": "JWT из POST /api/auth/login (или /register): веб-клиент и админка"},
        "XApiKey": {"type": "apiKey", "in": "header", "name": "X-API-Key",
                    "description": "API-токен интеграции: X-API-Key: wcb_... (или Authorization: Bearer wcb_...)"},
    }
    for route in app.routes:
        if not hasattr(route, "dependant"):
            continue
        path_item = (schema.get("paths") or {}).get(route.path)
        if not path_item:
            continue
        kinds = _auth_kinds(route)
        if not kinds:
            continue
        sec = []
        if "jwt" in kinds:
            sec.append({"BearerJWT": []})
        if "token" in kinds:
            sec.append({"XApiKey": []})
        for m in _OPENAPI_METHODS:
            if m in path_item and isinstance(path_item[m], dict):
                path_item[m]["security"] = sec
    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = _custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router.router)
app.include_router(search_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)
app.include_router(provider_router.router)
app.include_router(auth_router.router)
app.include_router(sessions_router.router)
app.include_router(tokens_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )