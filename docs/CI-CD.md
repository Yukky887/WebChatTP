# CI/CD WebCheckDB (Parts AI Assistant)

Схема: **Mac (dev) → develop (staging: автотесты + ручное тестирование) → main + ручной аппрув (prod)**.

```
 feature/*  ──PR──▶  develop  ──auto──▶  STAGING  ──ручная кнопка+approval──▶  PROD
    │                   │                  │                                     │
  CI (тесты)         CI + сборка        тыкаешь руками                    только проверенное
                     образов в GHCR                                       (промоут тех же образов)
```

---

## 1. Окружения

| Среда | Где | Как деплоится | Образы |
|---|---|---|---|
| **dev** | твой Mac | `docker compose up` | build локально |
| **staging** | Portainer (стек `webcheckdb-staging`) | автоматически при push в `develop` | `:staging`, `:sha-xxxxxxx` |
| **prod** | Portainer (стек `webcheckdb-prod`) | вручную (Actions → Deploy to Production) + approval | `:latest`, `:vX.Y.Z` |

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
4. Мержишь PR в `develop` → `.github/workflows/deploy-staging.yml`:
   собирает образы, пушит в GHCR, дёргает Portainer webhook, ждёт `/api/health`.
5. Заходишь в staging, **тестируешь руками**. Если что-то не так — правь и снова пуш в `develop`.
6. Всё ок → GitHub Actions → **Deploy to Production** → Run workflow:
   - `image_tag` = `staging` (или конкретный `sha-xxxxxxx`),
   - `release_tag` = `v1.2.3` (по желанию).
   - Ждёшь approval (Required reviewers), после чего образы промоутятся (`:latest` + `:vX.Y.Z`)
     и Portainer перезапускает прод.

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
- [ ] `PORTAINER_WEBHOOK_STAGING` — webhook URL staging-стека из Portainer.
- [ ] `PORTAINER_WEBHOOK_PROD` — webhook URL prod-стека из Portainer.

**Variables** (не секреты)
- [ ] `STAGING_URL` — например `http://sup5.tradesoft.corp:3001` (для smoke-теста).
- [ ] `PROD_URL` — например `http://sup5.tradesoft.corp:3000`.

> `GITHUB_TOKEN` уже используется для пуша в GHCR — отдельный токен для CI не нужен.

### 4.4. Portainer: доступ к GHCR (чтобы тянуть приватные образы)

- [ ] Получить GitHub PAT (classic) со scope **`read:packages`**.
- [ ] Portainer → **Registries → Add registry → Custom registry**:
  - Registry URL: `ghcr.io`
  - Username: твой GitHub-логин (`Yukky887`)
  - Password: PAT

### 4.5. Portainer: создать стеки

**Staging** — Stacks → Add stack → name `webcheckdb-staging`:

- [ ] Выбрать **Repository**: репозиторий `Yukky887/WebChatTP`, ветка `develop`,
      Compose path — `docker-compose.staging.yml`.
- [ ] В **Environment variables** задать значения из `.env.staging.example`
      (свои пароли/ключи, `POSTGRES_DB=partsai_staging` и т.п.).
- [ ] Deploy the stack.
- [ ] Включить **Webhooks** у стека и скопировать URL → в GitHub secret `PORTAINER_WEBHOOK_STAGING`.

**Prod** — Stacks → Add stack → name `webcheckdb-prod`:

- [ ] Repository: ветка `main`, Compose path `docker-compose.prod.yml`.
- [ ] Environment variables из `.env.production.example` (+ `IMAGE_TAG=latest`, свои порты).
- [ ] Deploy the stack.
- [ ] Включить webhook → GitHub secret `PORTAINER_WEBHOOK_PROD`.

> Порти для доступа к стендам: staging `3001`/`8001`, prod `3000`/`8000` (задаются `FRONTEND_PORT`/`BACKEND_PORT`).

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
| `.github/workflows/deploy-staging.yml` | Сборка образов → GHCR → авто-деплой staging |
| `.github/workflows/deploy-prod.yml` | Промоут образов → ручной деплой prod (approval) |
| `docker-compose.staging.yml` | Стек staging (образы `:staging`) |
| `docker-compose.prod.yml` | Стек prod (образы по `IMAGE_TAG`) |
| `.env.staging.example` / `.env.production.example` | Шаблоны переменных окружения |
