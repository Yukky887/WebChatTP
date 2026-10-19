#!/bin/sh
set -e

echo "🔄 Применяем миграции БД (alembic upgrade head)..."
alembic upgrade head

echo "🚀 Запускаем backend..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
