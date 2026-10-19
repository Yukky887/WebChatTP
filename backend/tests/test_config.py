"""Юнит-тесты конфигурации.

Проверяют, что конфиг импортируется без обязательных переменных окружения
и содержит значения по умолчанию (важно для запуска в CI без .env).
"""
import config


def test_jwt_defaults():
    assert config.JWT_ALGORITHM == "HS256"
    assert config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES > 0
    assert config.JWT_REFRESH_TOKEN_EXPIRE_DAYS > 0


def test_database_url_default_present():
    assert config.DATABASE_URL
    assert config.DATABASE_URL.startswith("postgresql")


def test_build_database_url_encodes_special_chars(monkeypatch):
    """Пароль со спецсимволами не должен ломать DSN (регресс: '@' в пароле)."""
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("POSTGRES_USER", "partsai")
    monkeypatch.setenv("POSTGRES_PASSWORD", "p@ss/word:1")
    monkeypatch.setenv("POSTGRES_HOST", "postgres")
    monkeypatch.setenv("POSTGRES_PORT", "5432")
    monkeypatch.setenv("POSTGRES_DB", "partsai")
    url = config.build_database_url()
    assert url == "postgresql+asyncpg://partsai:p%40ss%2Fword%3A1@postgres:5432/partsai"


def test_build_database_url_prefers_explicit(monkeypatch):
    explicit = "postgresql+asyncpg://u:p@h:5432/d"
    monkeypatch.setenv("DATABASE_URL", explicit)
    assert config.build_database_url() == explicit


def test_qdrant_collections_present():
    assert config.QDRANT_COLLECTIONS["tickets"]
    assert config.QDRANT_COLLECTIONS["parts_resource"]
    assert config.QDRANT_COLLECTIONS["parts_intellect"]
