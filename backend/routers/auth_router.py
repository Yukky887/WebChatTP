# backend/routers/auth_router.py
from db.models import User
from dependencies.auth import require_auth
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from db.session import get_db
from models import RegisterRequest, AuthLoginRequest, TokenResponse, UserInfo  # ← AuthLoginRequest!
from services.auth_service import (
    register_user, authenticate_user, get_user_with_relations,
    user_to_dict, create_access_token, create_refresh_token, decode_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Регистрация"""
    user = await register_user(
        db,
        username=request.username,
        password=request.password,
        email=request.email,
        group_id=request.group_id,
    )
    
    if not user:
        raise HTTPException(400, "Пользователь уже существует или роль не найдена")
    
    user_data = await user_to_dict(db, user)
    
    return TokenResponse(
        access_token=create_access_token(user.id, user.username, user_data["role"] or "user"),
        refresh_token=create_refresh_token(user.id),
        user=user_data,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: AuthLoginRequest, db: AsyncSession = Depends(get_db)):  # ← AuthLoginRequest!
    """Логин"""
    user = await authenticate_user(db, request.username, request.password)
    
    if not user:
        raise HTTPException(401, "Неверный логин или пароль")
    
    user_data = await user_to_dict(db, user)
    
    return TokenResponse(
        access_token=create_access_token(user.id, user.username, user_data["role"] or "user"),
        refresh_token=create_refresh_token(user.id),
        user=user_data,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(refresh_token: str, db: AsyncSession = Depends(get_db)):
    """Обновление токена"""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(401, "Неверный refresh токен")
    
    user_id = int(payload["sub"])
    user = await get_user_with_relations(db, user_id)
    
    if not user or not user.is_active:
        raise HTTPException(401, "Пользователь не найден")
    
    user_data = await user_to_dict(db, user)
    
    return TokenResponse(
        access_token=create_access_token(user.id, user.username, user_data["role"] or "user"),
        refresh_token=create_refresh_token(user.id),
        user=user_data,
    )


@router.get("/me", response_model=UserInfo)
async def me(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """Текущий пользователь"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Не авторизован")
    
    token = authorization[7:]
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(401, "Неверный токен")
    
    user_id = int(payload["sub"])
    user = await get_user_with_relations(db, user_id)
    
    if not user:
        raise HTTPException(404, "Пользователь не найден")
    
    data = await user_to_dict(db, user)
    return UserInfo(**data)

# backend/routers/auth_router.py

@router.get("/me/sessions")
async def my_sessions(user: User = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    """Все чаты текущего пользователя"""
    from sqlalchemy import select, desc
    from db.models import ChatSession
    
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(desc(ChatSession.updated_at))
        .limit(50)
    )
    sessions = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
            "provider_id": s.provider_id,
            "selected_program": s.selected_program,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.get("/me/sessions/{session_id}")
async def get_session_messages(session_id: str, user: User = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    """Сообщения конкретной сессии"""
    from uuid import UUID
    from db.repositories import ChatRepository
    
    repo = ChatRepository(db)
    try:
        session = await repo.get_session(UUID(session_id))
    except ValueError:
        raise HTTPException(400, "Неверный ID сессии")
    
    if not session:
        raise HTTPException(404, "Сессия не найдена")
    
    # Проверяем что сессия принадлежит пользователю
    if session.user_id != user.id:
        raise HTTPException(403, "Нет доступа")
    
    messages = await repo.get_session_messages(session.id, limit=100)
    
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "program_id": m.program_id,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]