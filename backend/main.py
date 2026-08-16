from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import (
    chat_router, 
    search_router, 
    health_router, 
    admin_router, 
)
from services.model_service import refresh_all_models
from config import LLM_PROVIDERS, CURRENT_PROVIDER, CURRENT_MODEL


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл приложения"""
    # Startup
    print("🚀 Запуск сервера...")
    await refresh_all_models()
    
    any_enabled = any(c["enabled"] for c in LLM_PROVIDERS.values())
    
    if any_enabled:
        print(f"✅ Провайдер: {CURRENT_PROVIDER}, Модель: {CURRENT_MODEL}")
    else:
        print("⚠️ Все провайдеры отключены!")
        print("   Пароль админки: admin123")
    
    yield  # Здесь приложение работает
    
    # Shutdown (если нужно)
    print("👋 Завершение работы...")


app = FastAPI(
    title="Vector DB Compare & Chat",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(health_router.router)
app.include_router(search_router.router)
app.include_router(chat_router.router)
app.include_router(admin_router.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )