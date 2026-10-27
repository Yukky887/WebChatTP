# backend/llm_providers.py
"""Провайдеры LLM — работа с API"""
import httpx
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession

from db.repositories import SettingsRepository


_clients: Dict[str, httpx.AsyncClient] = {}


def _get_client(base_url: str, api_key: str = "") -> httpx.AsyncClient:
    """Получает или создаёт HTTP клиент"""
    key = f"{base_url}|{api_key}"
    if key not in _clients:
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        _clients[key] = httpx.AsyncClient(
            base_url=base_url,
            timeout=180.0,
            headers=headers if headers else None,
        )
    return _clients[key]


async def chat_completion(
    provider_id: str,
    base_url: str,
    api_type: str,
    api_key: str,
    model: str,
    messages: List[Dict],
    db: AsyncSession,
    max_tokens_limit: int = None,  # опциональный потолок ответных токенов (vision)
) -> Dict:
    """
    Универсальный запрос к LLM.
    Настройки (temperature, max_tokens) читаются из БД.
    """
    client = _get_client(base_url, api_key)
    
    # Получаем настройки из БД
    settings_repo = SettingsRepository(db)
    llm_settings = await settings_repo.get_llm_settings()
    
    if api_type == "ollama":
        return await _ollama_chat(client, model, messages, llm_settings, max_tokens_limit)
    else:
        return await _openai_chat(client, model, messages, llm_settings, provider_id, max_tokens_limit)


def _content_text(content) -> str:
    """Безопасно извлекает текст из content (str или массив частей)"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(
            p.get("text", "") for p in content
            if isinstance(p, dict) and p.get("type") == "text"
        )
    return ""


async def _ollama_chat(client, model, messages, settings, max_tokens_limit=None) -> Dict:
    limit = max_tokens_limit or settings.max_tokens
    resp = await client.post("/api/chat", json={
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": float(settings.temperature),
            "num_predict": min(int(limit), int(settings.max_tokens)),
            "top_p": float(settings.top_p),
            "repeat_penalty": float(settings.repeat_penalty),
            "num_ctx": settings.num_ctx,
        }
    })
    
    if resp.status_code == 200:
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        pt = sum(len(_content_text(m.get("content", ""))) // 4 for m in messages)
        ct = len(content) // 4
        return {
            "content": content,
            "usage": {
                "prompt_tokens": pt,
                "completion_tokens": ct,
                "total_tokens": pt + ct,
                "cost": 0,
            },
            "finish_reason": "stop",
        }
    raise Exception(f"Ollama error: {resp.status_code} - {resp.text[:200]}")


async def _openai_chat(client, model, messages, settings, provider_id: str, max_tokens_limit=None) -> Dict:
    payload = {
        "model": model,
        "messages": messages,
        "temperature": float(settings.temperature),
        "max_tokens": int(max_tokens_limit) if max_tokens_limit else settings.max_tokens,
        "top_p": float(settings.top_p),
    }
    
    if provider_id == "llamacpp":
        payload["stop"] = ["<end_of_turn>", "<eos>"]
    
    resp = await client.post("/chat/completions", json=payload)
    
    if resp.status_code == 200:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        fr = data["choices"][0].get("finish_reason", "")
        
        if fr == "length":
            content += "\n\n⚠️ *Ответ обрезан.*"
        
        return {
            "content": content,
            "usage": {
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0),
                "cost": usage.get("cost", 0),
            },
            "finish_reason": fr,
        }
    raise Exception(f"{provider_id} error: {resp.status_code} - {resp.text[:200]}")