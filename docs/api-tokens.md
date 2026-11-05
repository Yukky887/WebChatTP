# API для внешних интеграций (API-токены)

Токен выдаётся в админ-панели → «🔑 API-токены» → «Сгенерировать».
Для каждого отдела задаётся набор коллекций, по которым разрешён поиск:

| Скоуп | Что это |
|---|---|
| `tickets` | Заявки ТП (история запросов техподдержки) |
| `parts_intellect` | Документация Parts.Intellect |
| `parts_resource` | Документация Parts.Resource |

Примеры профилей: отдел ТП — все три галочки; отдел продаж — только
`parts_intellect` + `parts_resource` (заявки ТП недоступны).

Значение токена показывается **один раз** при создании (в БД хранится только
sha256-хэш). Токен можно включать/выключать (переключатель «Активен») и
удалять — подача выключенного токена даёт `401`.

## Как передавать токен

Заголовком запроса (достаточно одного из вариантов):

```
X-API-Key: wcb_XXXXXXXXXXXXXXXXXXXXXX
Authorization: Bearer wcb_XXXXXXXXXXXXXXXXXXXXXX
```

## Эндпоинты (как у веб-клиента)

### POST /api/chat — вопрос-ответ

```bash
curl -s -X POST https://<host>:8000/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: wcb_...' \
  -d '{
    "message": "не загружается прайс-лист в программе",
    "provider": "llamacpp",          // из GET /api/providers (можно опустить — дефолт)
    "model": "имя-модели",           // можно опустить — дефолтная модель провайдера
    "program": "resource",           // parts.resource | parts.intellect (можно опустить — автоопределение)
    "use_web": false,                // «🌐 Умный поиск» — дополнительно к интернету
    "session_id": null,              // UUID для продолжения диалога (см. поле ответа)
    "attachments": [                 // до 4 картинок data:image/jpeg;base64,... (vision)
      "data:image/jpeg;base64,..."
    ]
  }'
```

Ответ:

```json
{
  "session_id": "uuid-диалога",
  "answer": "Текст ответа модели…",
  "sources": [ { "index": 1, "type": "ticket|documentation|web",
                 "title": "...", "url": "...", "score": 0.87 } ],
  "provider": "llamacpp", "model": "...",
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

Комментарии в JSON выше — иллюстративные; передавать нужно валидный JSON без них.

Поиск идёт ТОЛЬКО по скоупам токена. Например, токен «продажи»
(`parts_intellect` + `parts_resource`) никогда не увидит источники-заявки,
даже если вопрос касается исторических заявок.

### POST /api/search — только поиск по базе знаний (без LLM)

```bash
curl -s -X POST https://<host>:8000/api/search \
  -H 'Content-Type: application/json' -H 'X-API-Key: wcb_...' \
  -d '{"query": "не загружается прайс-лист"}'
```

Ответ — ранжированные фрагменты `results` с типами `ticket`/`documentation`
(ограничение те же — скоупы токена).

### GET /api/providers — доступные провайдеры и модели

```bash
curl -s https://<host>:8000/api/providers
```

Провайдеров и модели выбирают в запросах /api/chat через поля
`provider` / `model` — аналогично выбору в веб-клиенте.

### GET /api/sessions и GET /api/sessions/{id}/messages — история

История сессий, созданных с данным токеном (аналог «История чатов» веб-клиента):

```bash
curl -s https://<host>:8000/api/sessions -H 'X-API-Key: wcb_...'
curl -s https://<host>:8000/api/sessions/<session_id>/messages -H 'X-API-Key: wcb_...'
```

### GET /api/health — статус сервисов

```bash
curl -s https://<host>:8000/api/health
```

## Ограничения

- До 4 картинок на сообщение, каждая ≤10 МБ (base64 JPEG).
- Vision всегда работает через облачную `gemini-3.5-flash-lite`; скоупы
  коллекций на картинки не влияют (по плановым документам поиск не идёт).
- Сессии токена изолированы: токен не видит сессии юзеров, юзеры — сессии токена.
