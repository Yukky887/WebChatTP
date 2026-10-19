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


def test_qdrant_collections_present():
    assert config.QDRANT_COLLECTIONS["tickets"]
    assert config.QDRANT_COLLECTIONS["parts_resource"]
    assert config.QDRANT_COLLECTIONS["parts_intellect"]
