# Пошаговая настройка (руками, через веб-интерфейсы)

Это подробная инструкция «куда жать» для GitHub и Portainer.
Общая схема CI/CD — в [CI-CD.md](./CI-CD.md).

---

## Часть A. GitHub

Репозиторий: `https://github.com/Yukky887/WebChatTP`

### A1. Создать ветку `develop`

1. Открой репозиторий → кнопка выбора ветки (сейчас `main`) → введи `develop` → **Create branch: develop from main**.

### A2. Защита веток

1. **Settings** (вверху репозитория) → левое меню **Branches**.
2. **Add branch protection rule** (или *Add classic branch protection rule*).
3. **Branch name pattern**: `main`.
4. Включи:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging** → в поиске добавь `Backend Tests` и `Frontend Build`
     (появятся в списке после первого прогона CI; если пусто — сначала сделай любой PR).
5. **Create**.
6. Повтори для pattern `develop`.

### A3. Environments (ручной gate перед продом)

1. **Settings** → **Environments** → **New environment**.
2. Имя: `staging` → **Configure environment** (ничего не добавляй) → Save.
3. Снова **New environment** → имя: `production`.
4. ✅ **Required reviewers** → добавь себя (`Yukky887`) → Save protection rules.

### A4. Secrets и Variables

**Settings** → **Secrets and variables** → **Actions**.

Вкладка **Secrets** → **New repository secret** (добавь после того, как получишь webhook-URL из Portainer, см. B5):
- `PORTAINER_WEBHOOK_STAGING`
- `PORTAINER_WEBHOOK_PROD`

Вкладка **Variables** → **New repository variable**:
- `STAGING_URL` = `http://sup5.tradesoft.corp:3001`
- `PROD_URL` = `http://sup5.tradesoft.corp:3000`

### A5. GitHub PAT для Portainer (чтобы тянуть образы из GHCR)

1. Залогинься на github.com → аватар → **Settings**.
2. Внизу слева **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
3. **Generate new token (classic)**. Note: `portainer-ghcr`.
4. Отметь scope ✅ **read:packages** (можно ещё `repo`, если репозиторий приватный).
5. **Generate token** → скопируй (показывается один раз). Пригодится в B1.

---

## Часть B. Portainer

Открой `http://sup5.tradesoft.corp:9000`. Нужны права администратора.

### B1. Добавить реестр GHCR

1. Левое меню **Registries** → **Add registry**.
2. Выбери **Custom registry**.
3. Заполни:
   - **Name**: `GitHub Container Registry`
   - **Registry URL**: `ghcr.io`
   - **Authentication**: ✅ On
   - **Username**: `Yukky887`
   - **Password**: вставь PAT из шага A5.
4. **Add registry**.

### B2. Создать staging-стек

1. Левое меню **Stacks** → **Add stack**.
2. **Name**: `webcheckdb-staging`.
3. **Build method**: **Repository**.
4. Заполни:
   - **Repository URL**: `https://github.com/Yukky887/WebChatTP`
   - **Repository reference**: `refs/heads/develop`  ← полный ref (Portainer 2.39)
   - **Compose path**: `docker-compose.staging.yml`  ← путь от корня репозитория
   - (если репозиторий приватный — включи Authentication и укажи логин/PAT)

> ℹ️ В этом поле нужен **полный git-ref**: ветка — `refs/heads/<branch>`, тег — `refs/tags/<tag>`.
> Просто `develop` Portainer не находит: `could not find ref "develop"`.
>
> ⚠️ Файл `docker-compose.staging.yml` должен быть **закоммичен и запушен** в ветку `develop`.
> Portainer клонирует репозиторий с GitHub, поэтому локальных (незапушенных) файлов он не видит —
> ошибка `... docker-compose.staging.yml: no such file or directory` означает именно это.
5. Прокрути к **Environment variables** → **Add an environment variable** для каждой (значения — из `.env.staging.example`, подставь свои сильные пароли):
   - `POSTGRES_USER` = `partsai`
   - `POSTGRES_PASSWORD` = `<сильный пароль>`
   - `POSTGRES_DB` = `partsai_staging`
   - `QDRANT_URL`, `WEAVIATE_URL`, `OLLAMA_URL`, `LLAMACPP_URL`, `ROUTERAI_URL`, `ROUTERAI_API_KEY`
   - `ADMIN_PASSWORD` = `<сильный пароль админа>`
   - `JWT_SECRET_KEY` = `<длинная случайная строка>`
   - `EMBEDDING_DOCS_MODEL`, `EMBEDDING_TICKETS_MODEL`
   - `BACKEND_PORT` = `8001`
   - `FRONTEND_PORT` = `3001`
6. **Deploy the stack**.

### B3. Создать prod-стек

Повтори B2 с отличиями:
- **Name**: `webcheckdb-prod`
- **Repository reference**: `refs/heads/main`
- **Compose path**: `docker-compose.prod.yml`
- `POSTGRES_DB` = `partsai`, `BACKEND_PORT` = `8000`, `FRONTEND_PORT` = `3000`
- добавь переменную `IMAGE_TAG` = `latest`

### B4. Проверить, что стек поднялся

1. **Stacks** → открой стек → **Containers**.
2. У `parts-ai-backend-*` статус должен стать **healthy** (healthcheck из Dockerfile).
3. Открой `http://sup5.tradesoft.corp:3001/api/health` (staging) — должен вернуться JSON.

### B5. Включить webhook и забрать URL

1. **Stacks** → открой `webcheckdb-staging`.
2. Найди блок **Webhooks** (в разных версиях: кнопка/иконка «Webhooks» либо раздел **GitOps updates** → **Webhook**).
3. ✅ Включи webhook → **Copy link**. URL вида:
   `http://sup5.tradesoft.corp:9000/api/stacks/webhooks/xxxxxxxx-xxxx-...`
4. Вставь его в GitHub: **Settings → Secrets and variables → Actions → New repository secret** → `PORTAINER_WEBHOOK_STAGING`.
5. Повтори то же для `webcheckdb-prod` → секрет `PORTAINER_WEBHOOK_PROD`.

---

## Часть C. Проверка, что всё работает

1. Локально: `git checkout -b feature/test && git push -u origin feature/test`.
2. На GitHub открой PR в `develop` → должен запуститься **CI** (Backend Tests + Frontend Build).
3. Смержи PR в `develop` → запустится **Deploy to Staging** → через ~1–2 мин проверь `http://sup5.tradesoft.corp:3001`.
4. **Actions** → **Deploy to Production** → **Run workflow** → `image_tag=staging` → появится запрос approval → подтверди → прод обновится.

---

## Шпаргалка по секретам

| Где | Имя | Значение |
|---|---|---|
| GitHub Secret | `PORTAINER_WEBHOOK_STAGING` | webhook staging-стека (B5) |
| GitHub Secret | `PORTAINER_WEBHOOK_PROD` | webhook prod-стека (B5) |
| GitHub Variable | `STAGING_URL` | `http://sup5.tradesoft.corp:3001` |
| GitHub Variable | `PROD_URL` | `http://sup5.tradesoft.corp:3000` |
| Portainer Registry | password | GitHub PAT (`read:packages`) |
