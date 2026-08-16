import httpx
from typing import Dict, List
from config import LLM_PROVIDERS, llm_settings

clients: Dict[str, httpx.AsyncClient] = {}

def get_client(provider: str) -> httpx.AsyncClient:
    if provider not in clients:
        config = LLM_PROVIDERS[provider]
        headers = {}
        if config.get("api_key"):
            headers["Authorization"] = f"Bearer {config['api_key']}"
        clients[provider] = httpx.AsyncClient(
            base_url=config["base_url"],
            timeout=180.0,
            headers=headers if headers else None
        )
    return clients[provider]

async def chat_completion(provider: str, model: str, messages: List[Dict]) -> Dict:
    """Универсальный запрос к LLM"""
    client = get_client(provider)
    
    if provider == "ollama":
        return await _ollama_chat(client, model, messages)
    elif provider in ["llamacpp", "routerai"]:
        return await _openai_chat(client, model, messages, provider)
    else:
        raise Exception(f"Неизвестный провайдер: {provider}")

async def _ollama_chat(client, model, messages):
    resp = await client.post("/api/chat", json={
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": llm_settings["temperature"],
            "num_predict": llm_settings["max_tokens"],
            "top_p": llm_settings["top_p"],
            "repeat_penalty": llm_settings["repeat_penalty"],
            "num_ctx": llm_settings["num_ctx"]
        }
    })
    
    if resp.status_code == 200:
        data = resp.json()
        content = data.get("message", {}).get("content", "")
        pt = sum(len(m["content"]) // 4 for m in messages)
        ct = len(content) // 4
        return {
            "content": content,
            "usage": {"prompt_tokens": pt, "completion_tokens": ct, "total_tokens": pt+ct, "cost": 0},
            "finish_reason": "stop"
        }
    raise Exception(f"Ollama error: {resp.status_code}")

async def _openai_chat(client, model, messages, provider):
    payload = {
        "model": model,
        "messages": messages,
        "temperature": llm_settings["temperature"],
        "max_tokens": llm_settings["max_tokens"],
        "top_p": llm_settings["top_p"],
    }
    
    if provider == "llamacpp":
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
                "cost": usage.get("cost", 0)
            },
            "finish_reason": fr
        }
    raise Exception(f"{provider} error: {resp.status_code}")