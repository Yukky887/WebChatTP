from typing import Dict, List, Optional
import uuid
from config import (
    LLM_PROVIDERS, llm_settings, DEFAULT_LLM_SETTINGS,
    ADMIN_PASSWORD, ALLOWED_MODELS, FAVORITE_MODELS,
    CURRENT_PROVIDER, CURRENT_MODEL
)

# Сессии админов
admin_sessions: set = set()

def check_admin(token: str) -> bool:
    """Проверяет токен админа"""
    return token in admin_sessions

def login(password: str) -> Optional[str]:
    """Вход в админку"""
    if password == ADMIN_PASSWORD:
        token = str(uuid.uuid4())
        admin_sessions.add(token)
        return token
    return None

def logout(token: str) -> None:
    """Выход из админки"""
    admin_sessions.discard(token)

def get_llm_settings() -> Dict:
    """Получает текущие настройки LLM"""
    return llm_settings.copy()

def update_llm_settings(settings: Dict) -> Dict:
    """Обновляет настройки LLM"""
    llm_settings.update({
        "temperature": settings.get("temperature", llm_settings["temperature"]),
        "max_tokens": settings.get("max_tokens", llm_settings["max_tokens"]),
        "top_p": settings.get("top_p", llm_settings["top_p"]),
        "repeat_penalty": settings.get("repeat_penalty", llm_settings["repeat_penalty"]),
        "num_ctx": settings.get("num_ctx", llm_settings["num_ctx"]),
    })
    
    if settings.get("system_prompt_template"):
        llm_settings["system_prompt_template"] = settings["system_prompt_template"]
    
    return llm_settings.copy()

def reset_settings() -> Dict:
    """Сбрасывает настройки на значения по умолчанию"""
    llm_settings.clear()
    llm_settings.update(DEFAULT_LLM_SETTINGS.copy())
    return llm_settings.copy()

def update_allowed_models(allowed: List[str], favorites: List[str]) -> Dict:
    """Обновляет белый список и избранное"""
    global ALLOWED_MODELS, FAVORITE_MODELS
    
    ALLOWED_MODELS.clear()
    ALLOWED_MODELS.extend(allowed)
    
    FAVORITE_MODELS.clear()
    FAVORITE_MODELS.extend(favorites)
    
    return {
        "allowed": list(ALLOWED_MODELS),
        "favorites": list(FAVORITE_MODELS)
    }

def toggle_provider(provider: str, enabled: bool) -> Dict:
    """Включает/выключает провайдера"""
    if provider not in LLM_PROVIDERS:
        raise ValueError(f"Неизвестный провайдер: {provider}")
    
    LLM_PROVIDERS[provider]["enabled"] = enabled
    return {"provider": provider, "enabled": enabled}

def set_api_key(provider: str, api_key: str) -> Dict:
    """Устанавливает API ключ для провайдера"""
    if provider not in LLM_PROVIDERS:
        raise ValueError(f"Неизвестный провайдер: {provider}")
    
    LLM_PROVIDERS[provider]["api_key"] = api_key
    
    # Сбрасываем клиент, чтобы пересоздался с новым ключом
    from llm_providers import clients
    if provider in clients:
        del clients[provider]
    
    return {"status": "ok"}

def group_models_by_family(models: List[str]) -> Dict[str, List[str]]:
    """Группирует модели по семействам"""
    groups: Dict[str, List[str]] = {}
    
    for model in models:
        ml = model.lower()
        if 'gemma' in ml: family = 'Gemma'
        elif 'deepseek' in ml: family = 'DeepSeek'
        elif 'llama' in ml: family = 'Llama'
        elif 'qwen' in ml: family = 'Qwen'
        elif 'mistral' in ml and 'mixtral' not in ml: family = 'Mistral'
        elif 'mixtral' in ml: family = 'Mixtral'
        elif 'phi' in ml: family = 'Phi'
        elif 'yi' in ml: family = 'Yi'
        elif 'command-r' in ml or 'cohere' in ml: family = 'Command R'
        elif 'code' in ml or 'codestral' in ml: family = 'Code'
        elif 'nomic' in ml: family = 'Nomic'
        elif 'bge' in ml or 'embed' in ml: family = 'Embedding'
        elif 'whisper' in ml or 'audio' in ml: family = 'Audio'
        elif 'vision' in ml or 'llava' in ml: family = 'Vision'
        elif 'gpt' in ml or 'openai' in ml: family = 'GPT'
        elif 'claude' in ml or 'anthropic' in ml: family = 'Claude'
        else: family = 'Other'
        
        if family not in groups:
            groups[family] = []
        groups[family].append(model)
    
    for family in groups:
        groups[family] = sorted(groups[family])
    
    priority = ['Gemma', 'Llama', 'DeepSeek', 'Qwen', 'Mistral', 'Mixtral',
                'Phi', 'Command R', 'Yi', 'Code', 'GPT', 'Claude',
                'Vision', 'Audio', 'Embedding', 'Nomic', 'Other']
    
    sorted_groups: Dict[str, List[str]] = {}
    for p in priority:
        if p in groups:
            sorted_groups[p] = groups[p]
    for g in groups:
        if g not in sorted_groups:
            sorted_groups[g] = groups[g]
    
    return sorted_groups