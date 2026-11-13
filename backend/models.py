from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SearchRequest(BaseModel):
    query: str
    limit: int = 15

class PageContext(BaseModel):
    """Контекст страницы из браузерного расширения (url/title/читабельный текст)."""
    url: str = ""
    title: str = ""
    text: str = ""

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    provider: Optional[str] = None
    model: Optional[str] = None
    program: Optional[str] = None
    # Изображения, прикреплённые к сообщению.
    # Каждый элемент — data URI вида "data:image/jpeg;base64,..."
    # (клиент сам сжимает до 1568px по длинной стороне, JPEG q80)
    attachments: Optional[List[str]] = []
    # «Умный поиск»: дополнительно искать информацию в интернете
    # (работает для текстовых сообщений; для картинок игнорируется)
    use_web: bool = False
    # Страница, с которой задан вопрос (браузерное расширение):
    # добавляется в контекст первым источником [Страница 1]
    page: Optional[PageContext] = None
    # Эскалация: клиент просит позвать живого специалиста.
    # Бот ставится на паузу, сессия → waiting_operator.
    call_operator: bool = False

class UsageInfo(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    cost: float = 0.0

class Source(BaseModel):
    index: int
    type: str  # "ticket" или "documentation"
    title: str
    url: str = ""
    score: float = 0
    content_length: int = 0
    author: str = ""
    date: str = ""
    question: str = ""

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    has_questions: bool = False
    suggestions: List[str] = []
    sources: List[Dict] = []
    provider: str = ""
    model: str = ""
    truncated: bool = False
    usage: UsageInfo = UsageInfo()
    program: Optional[str] = None
    needs_program_selection: bool = True
    # Эскалация: True — флаг call_operator принят, сессия ждёт спеца
    operator_called: bool = False
    # Текущий статус сессии (active/waiting_operator/operator_active/closed)
    session_status: Optional[str] = None

class LLMSettings(BaseModel):
    temperature: float = 0.5
    max_tokens: int = 8000
    top_p: float = 0.9
    repeat_penalty: float = 1.1
    num_ctx: int = 8192
    system_prompt_template: str = ""

class BlockedModelsUpdate(BaseModel):
    allowed: List[str]
    favorites: List[str]


# ==================== АУТЕНТИФИКАЦИЯ ====================

class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    group_id: Optional[int] = None


class AuthLoginRequest(BaseModel):  
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserInfo(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: Optional[str] = None
    group: Optional[str] = None
    group_id: Optional[int] = None
    is_active: bool = True