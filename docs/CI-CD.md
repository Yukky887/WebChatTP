# CI/CD WebCheckDB (Parts AI Assistant)

Схема: **Mac (dev) → develop (staging: автотесты + ручное тестирование) → main + ручной аппрув (prod)**.

```
 feature/*  ──PR──▶  develop  ──auto──▶  STAGING  ──ручная кнопка+approval──▶  PROD
    │                   │                  │                                     │
  CI (тесты)         CI + сборка       Watchtower сам                   только проверенное
                     образов в GHCR    подтягивает образ                (промоут тех же образов)
```

> ⚠️ **Почему не webhooks Portainer:** `sup5.tradesoft.corp` — внутренний хост, а
> GitHub-hosted раннеры работают в интернете и его не видят. Поэтому деплой
> инициируется **изнутри сети** — контейнером **Watchtower** в самом стеке:
> он раз в 5 минут опрашивает GHCR и перезапускает контейнер, когда появляется
> новый образ (`:staging` — на стенде, `:latest` — в проде после промоута).

---

## 1. Окружения

| Среда | Где | Как деплоится | Образы |
|---|---|---|---|
| **dev** | твой Mac | `docker compose up` | build локально |
| **staging** | Portainer (стек `webcheckdb-staging`) | push в `develop` → GHCR `:staging` → Watchtower подхватывает | `:staging`, `:sha-xxxxxxx` |
| **prod** | Portainer (стек `webcheckdb-prod`) | вручную (Actions → Deploy to Production) + approval → GHCR `:latest` → Watchtower | `:latest`, `:vX.Y.Z` |

Образы: `ghcr.io/yukky887/webchattp-backend` и `ghcr.io/yukky887/webchattp-frontend`.

---

## 2. Ветки

- `feature/*` — фичи. Пуш → прогоняется CI.
- `develop` — интеграция. Пуш → CI + **автодеплой в staging**.
- `main` — прод-ветка. Прямых пушей нет; прод выкатывается вручную кнопкой.

---

## 3. Ежедневный рабочий процесс

1. Локально на Mac: меняешь код, проверяешь `docker compose up`.
2. `git push origin feature/xxx` → создаёшь PR в `develop`.
3. CI (`.github/workflows/ci.yml`) гоняет тесты backend + сборку frontend. Нужен зелёный чек.
4. Мержишь PR в `develop` → `.github/workflows/deploy-staging.yml` собирает образы и
   пушит их в GHCR с тегом `:staging`. Дальше **Watchtower** внутри стека staging
   замечает новый образ и сам перезапускает backend/frontend (опрос каждые ~5 мин).
5. Заходишь в staging (`http://sup5.tradesoft.corp:3001`), **тестируешь руками**.
   Если что-то не так — правь и снова пуш в `develop`.
6. Всё ок → GitHub Actions → **Deploy to Production** → Run workflow:
   - `image_tag` = `staging` (или конкретный `sha-xxxxxxx`),
   - `release_tag` = `v1.2.3` (по желанию).
   - Ждёшь approval (Required reviewers) — образы промоутятся в `:latest` (+ `:vX.Y.Z`),
     а **Watchtower** прод-стека подтянет новый `:latest` в течение ~5 минут.

---

## 4. Что нужно настроить вручную (чек-лист)

### 4.1. GitHub: ветки и защита

- [ ] Создать ветку `develop` от `main`.
- [ ] Settings → Branches → добавить правила для `main` и `develop`:
  - Require a pull request before merging;
  - Require status checks to pass (выбрать `Backend Tests` и `Frontend Build`).

### 4.2. GitHub: Environments

Settings → Environments:

- [ ] `staging` — без обязательных ревьюеров.
- [ ] `production` — включить **Required reviewers** (добавь себя). Это и есть тот самый ручной gate перед продом.

### 4.3. GitHub: Secrets и Variables

Settings → Secrets and variables → Actions:

**Secrets**
- [ ] Ничего добавлять не нужно. Деплой делает Watchtower, ключи Portainer в CI не используются.

**Variables** (не секреты, справочно)
- [ ] `STAGING_URL` — например `http://sup5.tradesoft.corp:3001`.
- [ ] `PROD_URL` — например `http://sup5.tradesoft.corp:3000`.

> `GITHUB_TOKEN` уже используется для пуша в GHCR — отдельный токен для CI не нужен.
> Smoke-тест из workflow не делается: GitHub-раннеры не видят внутреннюю сеть.

### 4.4. Portainer: доступ к GHCR (чтобы тянуть приватные образы)

- [ ] Получить GitHub PAT (classic) со scope **`read:packages`**.
- [ ] Portainer → **Registries → Add registry → Custom registry**:
  - Registry URL: `ghcr.io`
  - Username: твой GitHub-логин (`Yukky887`)
  - Password: PAT

### 4.5. Portainer: создать стеки

**Staging** — Stacks → Add stack → name `webcheckdb-staging`:

- [ ] Выбрать **Repository**: репозиторий `Yukky887/WebChatTP`, Repository reference `refs/heads/develop`,
      Compose path — `docker-compose.staging.yml`.
- [ ] В **Environment variables** задать значения из `.env.staging.example`
      (свои пароли/ключи, `POSTGRES_DB=partsai_staging` и т.п.).
      ⚠️ `EMBEDDING_DOCS_MODEL` должен быть `BAAI/bge-m3`, а не название переменной.
- [ ] Deploy the stack.

**Prod** — Stacks → Add stack → name `webcheckdb-prod`:

- [ ] Repository: Repository reference `refs/heads/main`, Compose path `docker-compose.prod.yml`.
- [ ] Environment variables из `.env.production.example` (+ `IMAGE_TAG=latest`, свои порты).
- [ ] Deploy the stack.

> Порти для доступа к стендам: staging `3001`/`8001`, prod `3000`/`8000` (задаются `FRONTEND_PORT`/`BACKEND_PORT`).

### 4.6. Watchtower (автодеплой) — уже в compose

Отдельно настраивать ничего не нужно: сервис `watchtower` объявлен в обоих compose-файлах,
backend/frontend помечены label'ами
`com.centurylinklabs.watchtower.enable=true` и `...scope=staging|prod`.

- **staging** следит за тегом `:staging`, **prod** — за `:latest`.
- Опрос GHCR каждые 300 секунд (`WATCHTOWER_POLL_INTERVAL`).
- Postgres не обновляется (не помечен label'ом).
- Стенды должны быть запущены — иначе Watchtower не работает (он часть стека).

> Первый запуск backend занимает несколько минут: скачивается модель `BAAI/bge-m3`
> (~2 ГБ) в volume `*_embedding_cache_*`. Дальше она берётся из кэша.

---

## 5. Откат (rollback)

Прод всегда тянет образ по тегу `IMAGE_TAG`:

- В Portainer → стек `webcheckdb-prod` → Environment variables → поменять `IMAGE_TAG` на предыдущий
  (`v1.2.2` или `sha-xxxxxxx`) → **Update the stack**.
- Либо запустить **Deploy to Production** с `image_tag=∠ нужный старый тег`.

Откат по БД пока не автоматизирован (см. п. 6).

---

## 6. Миграции БД (Alembic)

Схема БД управляется через **Alembic** (`backend/migrations/`), а не через `init.sql`.

- Backend-контейнер при старте сам выполняет `alembic upgrade head` (см. `backend/entrypoint.sh`),
  затем запускает uvicorn. Так схема всегда актуальна при деплое.
- Начальные данные (роли, группы, провайдеры, настройки, программы, админ) создаёт
  `backend/db/seed.py` при первом запуске приложения — идемпотентно.
- Пароль админа по умолчанию берётся из переменной `ADMIN_PASSWORD`.

**Изменил модель/схему — сгенерируй миграцию:**

```bash
cd backend
# DATABASE_URL должен указывать на локальную БД
export DATABASE_URL="postgresql+asyncpg://partsai:partsai_secret@localhost:5433/partsai"
alembic revision --autogenerate -m "описание изменения"
alembic upgrade head
```

> ⚠️ Миграции применяются автоматически при деплое. Генерируй их локально, проверяй,
> и коммить вместе с изменением моделей.

**Сброс локальной БД** (данные не жалко):

```bash
docker compose down -v   # удалит volume с БД
docker compose up --build
```


---

## 7. Локальная проверка стека

```bash
# staging локально
cp .env.staging.example .env.staging
docker compose --env-file .env.staging -f docker-compose.staging.yml up -d

# prod локально
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d
```

## 8. Файлы

| Файл | Назначение |
|---|---|
| `.github/workflows/ci.yml` | Линт + тесты backend, typecheck/build frontend |
| `.github/workflows/deploy-staging.yml` | Сборка образов → GHCR `:staging` (деплой — Watchtower) |
| `.github/workflows/deploy-prod.yml` | Промоут образов → GHCR `:latest` (деплой — Watchtower) |
| `docker-compose.staging.yml` | Стек staging (образы `:staging`) |
| `docker-compose.prod.yml` | Стек prod (образы по `IMAGE_TAG`) |
| `.env.staging.example` / `.env.production.example` | Шаблоны переменных окружения |
