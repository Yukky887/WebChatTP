"""Юнит-тесты аутентификации (без БД).

Проверяют чистые функции: хеширование паролей и JWT.
"""
from services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_and_verify():
    hashed = hash_password("secret123")
    assert hashed != "secret123"
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_access_token_roundtrip():
    token = create_access_token(user_id=1, username="admin", role="admin")
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == "1"
    assert payload["username"] == "admin"
    assert payload["role"] == "admin"
    assert payload["type"] == "access"


def test_refresh_token_roundtrip():
    token = create_refresh_token(user_id=42)
    payload = decode_token(token)

    assert payload is not None
    assert payload["sub"] == "42"
    assert payload["type"] == "refresh"


def test_decode_invalid_token_returns_none():
    assert decode_token("not-a-valid-token") is None
