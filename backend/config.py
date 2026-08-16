from typing import List, Dict

# ==================== БАЗЫ ДАННЫХ ====================
WEAVIATE_URL = "http://192.168.128.123:6789"
QDRANT_URL = "http://192.168.128.123:6333"

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
EMBEDDING_DOCS_MODEL = "intfloat/multilingual-e5-base"

EMBEDDING_TICKETS = {
    "model": "qwen/qwen3-embedding-4b",
    "endpoint": "https://routerai.ru/api/v1/embeddings",
    "api_key": "sk-LqDGeEaYU0vMmTXqkoirJpNCnNltXEPi",
    "dimension": 2560
}

# ==================== LLM ПРОВАЙДЕРЫ ====================
LLM_PROVIDERS = {
    "ollama": {
        "name": "Ollama (локальный)",
        "base_url": "http://192.168.128.123:6790",
        "api_type": "ollama",
        "models": [],
        "enabled": False,
    },
    "llamacpp": {
        "name": "llama.cpp (Gemma)",
        "base_url": "http://192.168.0.254:8080/v1",
        "api_type": "openai",
        "models": [],
        "enabled": False
    },
    "routerai": {
        "name": "RouterAI (облачный)",
        "base_url": "https://routerai.ru/api/v1",
        "api_type": "openai",
        "api_key": "sk-LqDGeEaYU0vMmTXqkoirJpNCnNltXEPi",
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
    "system_prompt_template": """Ты - ассистент по Parts.Intellect и Parts.Resource. Отвечай на русском.

КОНТЕКСТ ({sources_count} источников, {total_chars} символов):
{context_text}

ПРАВИЛА:
1. Отвечай подробно, охватывая ВСЕ релевантные разделы
2. Используй Markdown для форматирования
3. Указывай источники в формате [1], [2]

УТОЧНЯЮЩИЕ ВОПРОСЫ:
- Если информации недостаточно - задай вопрос: "Уточните: ..."

ИСТОРИЯ:
{history}"""
}

# ==================== АДМИН ====================
ADMIN_PASSWORD = "admin123"

# ==================== СОСТОЯНИЕ ====================
CURRENT_PROVIDER = "ollama"
CURRENT_MODEL = ""
ALLOWED_MODELS: List[str] = []
FAVORITE_MODELS: List[str] = []

# Текущие настройки LLM (меняются через админку)
llm_settings = DEFAULT_LLM_SETTINGS.copy()