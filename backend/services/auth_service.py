"""Сервис аутентификации"""
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_REFRESH_TOKEN_EXPIRE_DAYS
from db.models import User, Role, Group


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==================== ПАРОЛИ ====================

def hash_password(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Проверяет пароль"""
    return pwd_context.verify(plain, hashed)


# ==================== JWT ====================

def create_access_token(user_id: int, username: str, role: str) -> str:
    """Создаёт access токен"""
    expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> str:
    """Создаёт refresh токен"""
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    """Декодирует JWT токен"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


# ==================== РЕГИСТРАЦИЯ / ЛОГИН ====================

async def register_user(
    db: AsyncSession,
    username: str,
    password: str,
    email: Optional[str] = None,
    group_id: Optional[int] = None,
    role_name: str = "user",
) -> Optional[User]:
    """Регистрирует нового пользователя"""
    # Проверка на существование
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        return None

    # Получаем роль
    result = await db.execute(select(Role).where(Role.name == role_name))
    role = result.scalar_one_or_none()
    if not role:
        return None

    email = email.strip() if email else None
    if email == "":
        email = None


    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role_id=role.id,
        group_id=group_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> Optional[User]:
    """Аутентификация пользователя"""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    # Обновляем last_login
    user.last_login = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def get_user_with_relations(db: AsyncSession, user_id: int) -> Optional[User]:
    """Получает пользователя с ролью и группой"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def user_to_dict(db: AsyncSession, user: User) -> Dict:
    """Преобразует пользователя в словарь"""
    # Получаем роль
    result = await db.execute(select(Role).where(Role.id == user.role_id))
    role = result.scalar_one_or_none()

    # Получаем группу
    group = None
    if user.group_id:
        result = await db.execute(select(Group).where(Group.id == user.group_id))
        group = result.scalar_one_or_none()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": role.name if role else None,
        "group": group.name if group else None,
        "group_id": user.group_id,
        "is_active": user.is_active,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }