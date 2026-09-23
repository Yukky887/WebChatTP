# backend/services/admin_service.py
"""Сервис админки"""
from typing import Dict, List, Optional
import uuid

# Сессии админов
admin_sessions: set = set()

from config import ADMIN_PASSWORD


def check_admin(token: str) -> bool:
    return token in admin_sessions


def login(password: str) -> Optional[str]:
    if password == ADMIN_PASSWORD:
        token = str(uuid.uuid4())
        admin_sessions.add(token)
        return token
    return None


def logout(token: str) -> None:
    admin_sessions.discard(token)


def group_models_by_family(models: List[str]) -> Dict[str, List[str]]:
    """Группирует модели по семействам"""
    groups = {}
    for model in models:
        ml = model.lower()
        if 'gemma' in ml: family = 'Gemma'
        elif 'deepseek' in ml: family = 'DeepSeek'
        elif 'llama' in ml: family = 'Llama'
        elif 'qwen' in ml: family = 'Qwen'
        elif 'mistral' in ml: family = 'Mistral'
        elif 'mixtral' in ml: family = 'Mixtral'
        elif 'phi' in ml: family = 'Phi'
        elif 'yi' in ml: family = 'Yi'
        elif 'code' in ml: family = 'Code'
        elif 'gpt' in ml: family = 'GPT'
        elif 'claude' in ml: family = 'Claude'
        else: family = 'Other'
        
        if family not in groups:
            groups[family] = []
        groups[family].append(model)
    
    for family in groups:
        groups[family] = sorted(groups[family])
    
    priority = ['Gemma', 'Llama', 'DeepSeek', 'Qwen', 'Mistral', 'Mixtral',
                'Phi', 'Yi', 'Code', 'GPT', 'Claude', 'Other']
    
    sorted_groups = {}
    for p in priority:
        if p in groups:
            sorted_groups[p] = groups[p]
    for g in groups:
        if g not in sorted_groups:
            sorted_groups[g] = groups[g]
    
    return sorted_groups