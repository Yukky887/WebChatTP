import os
from typing import List
from dotenv import load_dotenv

# Загружаем .env
load_dotenv()

def get_env(key: str, default: str = "") -> str:
    """Получает значение из .env с fallback"""
    return os.getenv(key, default)

# ==================== БАЗЫ ДАННЫХ ====================
WEAVIATE_URL = get_env("WEAVIATE_URL", "http://192.168.128.123:6789")
QDRANT_URL = get_env("QDRANT_URL", "http://192.168.128.123:6333")

# Коллекции Qdrant
QDRANT_COLLECTIONS = {
    "tickets": "TsSpKb",
    "parts_resource": "PartsResource",
    "parts_intellect": "PartsIntellect"
}

SEARCH_LIMITS = {
    "tickets": 5,
    "parts_resource": 5,
    "parts_intellect": 5
}

# ==================== ЭМБЕДДИНГИ ====================
EMBEDDING_DOCS_MODEL = get_env("EMBEDDING_DOCS_MODEL", "intfloat/multilingual-e5-base")

EMBEDDING_TICKETS = {
    "model": get_env("EMBEDDING_TICKETS_MODEL", "qwen/qwen3-embedding-4b"),
    "endpoint": f"{get_env('ROUTERAI_URL', 'https://routerai.ru/api/v1')}/embeddings",
    "api_key": get_env("ROUTERAI_API_KEY", ""),
    "dimension": 2560
}

# ==================== LLM ПРОВАЙДЕРЫ ====================
OLLAMA_URL = get_env("OLLAMA_URL", "http://192.168.128.123:6790")
LLAMACPP_URL = get_env("LLAMACPP_URL", "http://192.168.0.254:8080/v1")
ROUTERAI_URL = get_env("ROUTERAI_URL", "https://routerai.ru/api/v1")
ROUTERAI_API_KEY = get_env("ROUTERAI_API_KEY", "")

LLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama (локальный)",
        "base_url": OLLAMA_URL,
        "api_type": "ollama",
        "models": [],
        "enabled": False,
    },
    "llamacpp": {
        "name": "llama.cpp (Gemma)",
        "base_url": LLAMACPP_URL,
        "api_type": "openai",
        "models": [],
        "enabled": False
    },
    "routerai": {
        "name": "RouterAI (облачный)",
        "base_url": ROUTERAI_URL,
        "api_type": "openai",
        "api_key": ROUTERAI_API_KEY,
        "models": [],
        "enabled": False,
    }
}

# ==================== НАСТРОЙКИ LLM ====================
DEFAULT_LLM_SETTINGS = {
    "temperature": 0.5,
    "max_tokens": 8000,
    "top_p": 0.9,
    "repeat_penalty": 1.1,
    "num_ctx": 8192,
    "system_prompt_template": """Ты - ассистент по Parts.Intellect. Отвечай на русском.

КОНТЕКСТ ({sources_count} источников, {total_chars} символов):
{context_text}

ПРАВИЛА:
1. Отвечай подробно, охватывая ВСЕ релевантные разделы
2. Используй Markdown для форматирования
3. Указывай источники в формате [1], [2]

УТОЧНЯЮЩИЕ ВОПРОСЫ:
- Если информации недостаточно - задай вопрос: "🤔 Уточните: ..."

ИСТОРИЯ:
{history}"""
}

# ==================== АДМИН ====================
ADMIN_PASSWORD = get_env("ADMIN_PASSWORD", "admin123")

# ==================== СОСТОЯНИЕ ====================
CURRENT_PROVIDER = "ollama"
CURRENT_MODEL = ""
ALLOWED_MODELS: List[str] = []
FAVORITE_MODELS: List[str] = []

# Текущие настройки LLM
llm_settings = DEFAULT_LLM_SETTINGS.copy()