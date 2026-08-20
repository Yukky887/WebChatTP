from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class SearchRequest(BaseModel):
    query: str
    limit: int = 15

class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    provider: Optional[str] = None
    model: Optional[str] = None
    program: Optional[str] = None

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

class LoginRequest(BaseModel):
    password: str