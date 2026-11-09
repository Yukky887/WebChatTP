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

# OpenAI-совместимый слой Gemini — позволяет подключить Google как обычного
# провайдера (api_type="openai") без отдельной ветки в llm_providers.
# Ключ задаётся не через env, а в админке (POST /api/admin/provider/apikey).
GEMINI_URL = get_env(
    "GEMINI_URL", "https://generativelanguage.googleapis.com/v1beta/openai"
)

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

# ==================== ВЕБ-ПОИСК («Умный поиск») ====================
# Если задан TAVILY_API_KEY — используется Tavily (бесплатно ~1000 запросов/мес,
# ключ с tavily.com). Иначе — DuckDuckGo (без ключа).
TAVILY_API_KEY = get_env("TAVILY_API_KEY", "")
SERPER_API_KEY = get_env("SERPER_API_KEY", "")
WEB_SEARCH_RESULTS = int(get_env("WEB_SEARCH_RESULTS", "5"))
WEB_SEARCH_TIMEOUT = float(get_env("WEB_SEARCH_TIMEOUT", "12"))

# ==================== QDRANT КОЛЛЕКЦИИ ====================
QDRANT_COLLECTIONS = {
    "tickets": "TsSpKb",
    "parts_resource": "PartsResource",
    "parts_intellect": "PartsIntellect"
}

# Выгрузки Bitrix24 (индексирует внешний процесс, хост 192.168.128.123).
# Требуют ИМЕНОВАННЫЙ вектор "dense" (2560, qwen3-embedding-4b) — как у tickets.
# В веб-клиенте/гостю НЕ подмешиваются: только скоупы API-токенов
# (bitrix_* появляется в allowed_scopes админки автоматически).
BITRIX_COLLECTIONS = {
    "bitrix_wiki":      "BitInfo_wiki",       # Wiki Bitrix
    "bitrix_doc":       "BitInfo_doc",        # Документация Битрикс24
    "bitrix_kb":        "BitInfo_kb",         # База знаний CRM
    "bitrix_lst":       "BitInfo_lst",        # Списки CRM (элементы)
    "bitrix_markup":    "BitInfo_markup",     # Разметка сделок
    "bitrix_ol":        "BitInfo_ol",         # Открытые линии — переписки
    "bitrix_olc":       "BitInfo_olc",        # Открытые линии — чаты
    "bitrix_saleskb":   "BitInfo_saleskb",    # База знаний продаж
    "bitrix_salesdeal": "BitInfo_salesdeal",  # Сделки CRM (крупнейшая, ~200k чанков)
}

# Имя именованного вектора у BitInfo_* коллекций (передаётся в Qdrant как using)
BITRIX_VECTOR_NAME = "dense"

# Адрес приложения BitrixInfo — для ссылки на bitrix-источники, у которых нет
# своего url (kb/lst/markup/ol/olc/saleskb/salesdeal хранят маршрут в payload.open:
# /api/kb/page/<id>, /api/row/deals/<id>, /api/ol/session/<id> …).
# Выдаёт администратор BitrixInfo, например "http://192.168.x.x:6800".
# Пусто → ссылки на эти источники не строятся (LLM указывает источник без url).
BITRIXINFO_URL = get_env("BITRIXINFO_URL", "")

SEARCH_LIMITS = {
    "tickets": 10,
    "parts_resource": 10,
    "parts_intellect": 10,
    # BitInfo: чанки мелкие и их много, держим умеренные лимиты,
    # чтобы LLM-контекст не разбухал (за запрос ≤ ~45 bitrix-чанков)
    "bitrix_wiki": 8,
    "bitrix_doc": 8,
    "bitrix_kb": 8,
    "bitrix_markup": 8,
    "bitrix_lst": 5,
    "bitrix_ol": 5,
    "bitrix_olc": 5,
    "bitrix_saleskb": 5,
    "bitrix_salesdeal": 5,
}

# ==================== JWT ====================
JWT_SECRET_KEY = get_env("JWT_SECRET_KEY", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 часа
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30