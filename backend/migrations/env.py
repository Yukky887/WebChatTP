"""Alembic environment (async).

DATABASE_URL берётся из переменных окружения. Модели регистрируются через
импорт `db.models` — он наполняет `Base.metadata`.
"""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from config import build_database_url
from db.session import Base
import db.models  # noqa: F401  — регистрация моделей в Base.metadata

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DSN собираем сами (см. config.build_database_url) и не кладём в
# config.set_main_option — иначе символ '%' из URL-кодирования пароля ломает
# подстановку в ConfigParser.
database_url = build_database_url()

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Запуск миграций в offline-режиме (генерация SQL без подключения)."""
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = create_async_engine(database_url, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
