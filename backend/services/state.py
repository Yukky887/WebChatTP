class AppState:
    """Состояние приложения"""
    
    def __init__(self):
        self.current_provider = "ollama"
        self.current_model = ""
        self.llm_settings = {}
        self.allowed_models = []
        self.favorite_models = []
    
    def get_provider(self) -> str:
        return self.current_provider
    
    def get_model(self) -> str:
        return self.current_model
    
    def set_provider(self, provider: str) -> None:
        self.current_provider = provider
    
    def set_model(self, model: str) -> None:
        self.current_model = model

# Синглтон
state = AppState()