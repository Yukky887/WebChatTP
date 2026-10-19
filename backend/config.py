# backend/config.py
import os
from typing import List
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


def get_env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# ==================== URL'ы (только они в config) ====================
WEAVIATE_URL = get_env("WEAVIATE_URL", "http://192.168.128.123:6789")
QDRANT_URL = get_env("QDRANT_URL", "http://192.168.128.123:6333")

# URL'ы провайдеров (для seed'а в БД при первом запуске)
OLLAMA_URL = get_env("OLLAMA_URL", "http://192.168.128.123:6790")
LLAMACPP_URL = get_env("LLAMACPP_URL", "http://192.168.0.254:8080/v1")
ROUTERAI_URL = get_env("ROUTERAI_URL", "https://routerai.ru/api/v1")
ROUTERAI_API_KEY = get_env("ROUTERAI_API_KEY", "")

# ==================== ЭМБЕДДИНГИ ====================
EMBEDDING_DOCS_MODEL = get_env("EMBEDDING_DOCS_MODEL", "intfloat/multilingual-e5-base")

EMBEDDING_TICKETS = {
    "model": get_env("EMBEDDING_TICKETS_MODEL", "qwen/qwen3-embedding-4b"),
    "endpoint": f"{ROUTERAI_URL}/embeddings",
    "api_key": ROUTERAI_API_KEY,
    "dimension": 2560
}

# ==================== БАЗА ДАННЫХ ====================


def build_database_url() -> str:
    """Собирает DSN для PostgreSQL.

    Если ``DATABASE_URL`` задан явно — используется как есть. Иначе DSN
    собирается из отдельных переменных ``POSTGRES_*`` с URL-кодированием
    пароля, чтобы спецсимволы (``@``, ``:``, ``/``, ``?``, ``#``) не ломали
    разбор URL (иначе SQLAlchemy режет DSN по первому ``@`` и получается
    битый хост вида ``pass@part@postgres``).
    """
    explicit = get_env("DATABASE_URL")
    if explicit:
        return explicit
    user = get_env("POSTGRES_USER", "partsai")
    password = quote_plus(get_env("POSTGRES_PASSWORD", "partsai_secret"))
    host = get_env("POSTGRES_HOST", "localhost")
    port = get_env("POSTGRES_PORT", "5432")
    db = get_env("POSTGRES_DB", "partsai")
    return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"


DATABASE_URL = build_database_url()

# ==================== АДМИН ====================
ADMIN_PASSWORD = get_env("ADMIN_PASSWORD", "admin123")

# ==================== QDRANT КОЛЛЕКЦИИ ====================
QDRANT_COLLECTIONS = {
    "tickets": "TsSpKb",
    "parts_resource": "PartsResource",
    "parts_intellect": "PartsIntellect"
}

SEARCH_LIMITS = {
    "tickets": 10,
    "parts_resource": 10,
    "parts_intellect": 10
}

# ==================== JWT ====================
JWT_SECRET_KEY = get_env("JWT_SECRET_KEY", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30