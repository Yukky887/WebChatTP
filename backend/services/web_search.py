# backend/services/web_search.py
"""Веб-поиск для «Умного поиска» в чате.

Приоритет провайдеров (первый с заданным ключом побеждает):
1. Tavily API (TAVILY_API_KEY, бесплатные ~1000 запросов/мес на tavily.com,
   выдаёт готовые текстовые сниппеты под LLM).
2. Serper.dev (SERPER_API_KEY, Google-поиск, 2500 запросов бесплатно при регистрации).
3. DuckDuckGo HTML (без ключа; часто ловит бот-детекцию — тогда веб-источников просто не будет,
   ответ модели не ломается).

Единый формат результата — как у внутренних источников, только type="web":
[{"type": "web", "title": str, "url": str, "score": float, "content": str}]
"""
import re
from urllib.parse import unquote

import httpx

from config import (TAVILY_API_KEY, SERPER_API_KEY, WEB_SEARCH_RESULTS,
                    WEB_SEARCH_TIMEOUT)

_HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"),
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
}


async def web_search(query: str, max_results: int = None) -> list:
    """Возвращает список веб-источников по запросу (пустой список — нечего добавить)."""
    n = max_results or WEB_SEARCH_RESULTS
    for fn in (_tavily, _serper, _duckduckgo):
        if fn is _tavily and not TAVILY_API_KEY:
            continue
        if fn is _serper and not SERPER_API_KEY:
            continue
        try:
            return await fn(query, n)
        except Exception as e:
            print(f"⚠️ {fn.__name__} недоступен: {e}")
    return []


async def _tavily(query: str, max_results: int) -> list:
    async with httpx.AsyncClient(timeout=WEB_SEARCH_TIMEOUT) as c:
        r = await c.post("https://api.tavily.com/search", json={
            "api_key": TAVILY_API_KEY,
            "query": query,
            "max_results": max_results,
            "include_answer": False,
            "search_depth": "basic",
        })
        r.raise_for_status()
        data = r.json()
    out = []
    for item in data.get("results", []):
        out.append({
            "type": "web",
            "title": (item.get("title") or "")[:200],
            "url": item.get("url") or "",
            "score": float(item.get("score") or 0),
            "content": (item.get("content") or "")[:900],
        })
    return out


async def _serper(query: str, max_results: int) -> list:
    async with httpx.AsyncClient(timeout=WEB_SEARCH_TIMEOUT) as c:
        r = await c.post("https://google.serper.dev/search",
                         headers={"X-API-KEY": SERPER_API_KEY},
                         json={"q": query, "num": max_results, "hl": "ru"})
        r.raise_for_status()
        data = r.json()
    out = []
    for item in data.get("organic", [])[:max_results]:
        out.append({
            "type": "web",
            "title": (item.get("title") or "")[:200],
            "url": item.get("link") or "",
            "score": 0,
            "content": (item.get("snippet") or "")[:900],
        })
    return out


_RESULT_SNIPPET_URL = r'<a class="result__a"[^>]+href="([^"]+)"'
_RESULT_TITLE = r'<a class="result__a"[^>]*>(.*?)</a>'
_RESULT_SNIPPET = r'<a class="result__snippet"[^>]*>(.*?)</a>'
_TAG = re.compile(r"<[^>]+>")


def _clean_ddg_url(href: str) -> str:
    # Ссылки DDG вида //duckduckgo.com/l/?uddg=<encoded>&rut=...
    href = href.strip()
    if href.startswith("//"):
        href = "https:" + href
    m = re.search(r"uddg=([^&]+)", href)
    return unquote(m.group(1)) if m else href


def _strip_tags(s: str) -> str:
    return _TAG.sub("", s or "").replace("&amp;", "&").replace("&quot;", '"').strip()


async def _duckduckgo(query: str, max_results: int) -> list:
    async with httpx.AsyncClient(timeout=WEB_SEARCH_TIMEOUT, headers=_HEADERS,
                                 follow_redirects=True) as c:
        r = await c.post("https://html.duckduckgo.com/html/", data={"q": query, "kl": "ru-ru"})
        r.raise_for_status()
        html = r.text

    urls = [_clean_ddg_url(u) for u in re.findall(_RESULT_SNIPPET_URL, html)]
    titles = [_strip_tags(t) for t in re.findall(_RESULT_TITLE, html, re.S)]
    snippets = [_strip_tags(s)[:900] for s in re.findall(_RESULT_SNIPPET, html, re.S)]

    out = []
    for i in range(min(max_results, min(len(urls), len(titles)))):
        out.append({
            "type": "web",
            "title": titles[i][:200],
            "url": urls[i],
            "score": 0,
            "content": snippets[i] if i < len(snippets) else "",
        })
    return out
