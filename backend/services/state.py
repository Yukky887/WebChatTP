# backend/services/state.py
"""Глобальное состояние (текущий провайдер/модель)"""


class AppState:
    def __init__(self):
        self.current_provider: str = ""
        self.current_model: str = ""


state = AppState()