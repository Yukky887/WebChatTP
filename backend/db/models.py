"""SQLAlchemy модели"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, 
    ForeignKey, DECIMAL, BigInteger, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from db.session import Base


class Role(Base):
    __tablename__ = 'roles'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship('User', back_populates='role')


class Group(Base):
    __tablename__ = 'groups'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    users = relationship('User', back_populates='group')


class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False)
    group_id = Column(Integer, ForeignKey('groups.id'))
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    role = relationship('Role', back_populates='users')
    group = relationship('Group', back_populates='users')


class LLMProvider(Base):
    __tablename__ = 'llm_providers'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    base_url = Column(String(255), nullable=False)
    api_type = Column(String(50), nullable=False)
    api_key_encrypted = Column(Text)
    is_enabled = Column(Boolean, default=False)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    models = relationship('LLMModel', back_populates='provider', cascade='all, delete-orphan')


class LLMModel(Base):
    __tablename__ = 'llm_models'
    __table_args__ = (UniqueConstraint('provider_id', 'name'),)
    
    id = Column(Integer, primary_key=True)
    provider_id = Column(String(50), ForeignKey('llm_providers.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(200), nullable=False)
    display_name = Column(String(200))
    context_size = Column(Integer)
    max_tokens = Column(Integer)
    is_allowed = Column(Boolean, default=False)
    is_favorite = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    provider = relationship('LLMProvider', back_populates='models')


class LLMSettings(Base):
    __tablename__ = 'llm_settings'
    
    id = Column(Integer, primary_key=True)
    temperature = Column(DECIMAL(3, 2), default=0.5)
    top_p = Column(DECIMAL(3, 2), default=0.9)
    repeat_penalty = Column(DECIMAL(4, 2), default=1.1)
    max_tokens = Column(Integer, default=8000)
    num_ctx = Column(Integer, default=8192)
    system_prompt_template = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ContextSettings(Base):
    __tablename__ = 'context_settings'
    
    id = Column(Integer, primary_key=True)
    use_tickets = Column(Boolean, default=True)
    use_documentation = Column(Boolean, default=True)
    tickets_limit = Column(Integer, default=5)
    docs_limit = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Program(Base):
    __tablename__ = 'programs'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    qdrant_collection = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    keywords = relationship('ProgramKeyword', back_populates='program', cascade='all, delete-orphan')


class ProgramKeyword(Base):
    __tablename__ = 'program_keywords'
    __table_args__ = (UniqueConstraint('program_id', 'keyword'),)
    
    id = Column(Integer, primary_key=True)
    program_id = Column(String(50), ForeignKey('programs.id', ondelete='CASCADE'), nullable=False)
    keyword = Column(String(200), nullable=False)
    weight = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    program = relationship('Program', back_populates='keywords')


class ChatSession(Base):
    __tablename__ = 'chat_sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default='gen_random_uuid()')
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
    provider_id = Column(String(50), ForeignKey('llm_providers.id'))
    model_id = Column(Integer, ForeignKey('llm_models.id'))
    selected_program = Column(String(50), ForeignKey('programs.id'))
    status = Column(String(20), default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    closed_at = Column(DateTime)
    
    messages = relationship('Message', back_populates='session', cascade='all, delete-orphan')


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(BigInteger, primary_key=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    program_id = Column(String(50), ForeignKey('programs.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    session = relationship('ChatSession', back_populates='messages')
    sources = relationship('MessageSource', back_populates='message', cascade='all, delete-orphan')
    usage = relationship('MessageUsage', back_populates='message', uselist=False, cascade='all, delete-orphan')
    feedback = relationship('MessageFeedback', back_populates='message', cascade='all, delete-orphan')


class MessageSource(Base):
    __tablename__ = 'message_sources'
    
    id = Column(BigInteger, primary_key=True)
    message_id = Column(BigInteger, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    source_type = Column(String(20), nullable=False)
    source_title = Column(String(500))
    source_url = Column(Text)
    qdrant_collection = Column(String(100))
    qdrant_score = Column(DECIMAL(5, 4))
    source_index = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship('Message', back_populates='sources')


class MessageUsage(Base):
    __tablename__ = 'message_usage'
    
    id = Column(BigInteger, primary_key=True)
    message_id = Column(BigInteger, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    cost = Column(DECIMAL(10, 6), default=0)
    response_time_ms = Column(Integer)
    likes_count = Column(Integer, default=0)
    dislikes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship('Message', back_populates='usage')


class MessageFeedback(Base):
    __tablename__ = 'message_feedback'
    __table_args__ = (UniqueConstraint('message_id', 'user_id'),)
    
    id = Column(BigInteger, primary_key=True)
    message_id = Column(BigInteger, ForeignKey('messages.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    rating = Column(String(10), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    message = relationship('Message', back_populates='feedback')
