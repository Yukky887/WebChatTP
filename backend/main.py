# backend/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    chat_router, search_router, health_router, admin_router, provider_router, provider_router, auth_router, sessions_router
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


app = FastAPI(title="Parts AI Assistant", lifespan=lifespan)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )