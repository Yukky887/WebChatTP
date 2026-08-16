from typing import List, Dict
import httpx
from config import LLM_PROVIDERS, ALLOWED_MODELS, FAVORITE_MODELS, CURRENT_PROVIDER, CURRENT_MODEL
from services.admin_service import group_models_by_family

def filter_models(models: List[str]) -> List[str]:
    """Оставляет только разрешенные модели"""
    if not models or not ALLOWED_MODELS:
        return []
    
    allowed = [m for m in models if m in ALLOWED_MODELS]
    favs = [m for m in allowed if m in FAVORITE_MODELS]
    others = sorted([m for m in allowed if m not in FAVORITE_MODELS])
    
    return favs + others

async def fetch_ollama_models_raw() -> List[str]:
    """Все модели Ollama без фильтрации"""
    try:
        from llm_providers import get_client
        client = get_client("ollama")
        r = await client.get("/api/tags", timeout=5)
        if r.status_code == 200:
            return sorted([m.get("name", "") for m in r.json().get("models", [])])
    except:
        pass
    return []

async def fetch_llamacpp_models_raw() -> List[str]:
    """Все модели llama.cpp без фильтрации"""
    try:
        from llm_providers import get_client
        client = get_client("llamacpp")
        r = await client.get("/models", timeout=5)
        if r.status_code == 200:
            return sorted([m.get("id", "") for m in r.json().get("data", [])])
    except:
        pass
    return []

async def fetch_routerai_models_raw() -> List[str]:
    """Все модели RouterAI без фильтрации"""
    try:
        from llm_providers import get_client
        client = get_client("routerai")
        r = await client.get("/models", timeout=5)
        if r.status_code == 200:
            return sorted([m.get("id", "") for m in r.json().get("data", [])])
    except:
        pass
    return []

async def refresh_all_models():
    """Обновляет модели всех провайдеров"""
    global CURRENT_PROVIDER, CURRENT_MODEL
    
    print("🔄 Обновление моделей...")
    
    LLM_PROVIDERS["ollama"]["models"] = filter_models(await fetch_ollama_models_raw())
    LLM_PROVIDERS["llamacpp"]["models"] = filter_models(await fetch_llamacpp_models_raw())
    LLM_PROVIDERS["routerai"]["models"] = filter_models(await fetch_routerai_models_raw())
    
    for pid in ["ollama", "llamacpp", "routerai"]:
        cfg = LLM_PROVIDERS[pid]
        print(f"   {cfg['name']}: {len(cfg['models'])} моделей (включен: {cfg['enabled']})")
    
    # Автовыбор
    if not CURRENT_MODEL:
        for pid in ["ollama", "llamacpp", "routerai"]:
            cfg = LLM_PROVIDERS[pid]
            if cfg["enabled"] and cfg["models"]:
                CURRENT_PROVIDER = pid
                CURRENT_MODEL = cfg["models"][0]
                break
    
    # Переключение
    cur = LLM_PROVIDERS.get(CURRENT_PROVIDER, {})
    if not cur.get("enabled") or not cur.get("models"):
        for pid in ["ollama", "llamacpp", "routerai"]:
            cfg = LLM_PROVIDERS[pid]
            if cfg["enabled"] and cfg["models"]:
                CURRENT_PROVIDER = pid
                CURRENT_MODEL = cfg["models"][0]
                print(f"⚠️ Переключились на {cfg['name']}")
                break
        else:
            CURRENT_MODEL = ""
            print("⚠️ Нет доступных провайдеров!")

async def get_providers_models() -> Dict:
    """Получает все модели по провайдерам с группировкой"""
    providers_models = {}
    
    for pid in ["ollama", "llamacpp", "routerai"]:
        raw = []
        if pid == "ollama":
            raw = await fetch_ollama_models_raw()
        elif pid == "llamacpp":
            raw = await fetch_llamacpp_models_raw()
        elif pid == "routerai":
            raw = await fetch_routerai_models_raw()
        
        providers_models[pid] = {
            "name": LLM_PROVIDERS[pid]["name"],
            "all_models": raw,
            "grouped": group_models_by_family(raw)
        }
    
    return providers_models