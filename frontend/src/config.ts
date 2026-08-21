const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api' || 'http://192.168.128.136:8000/api';

export const config = {
  apiBaseUrl: API_BASE_URL,
  
  endpoints: {
    // Health
    health: '/health',
    
    // Search
    search: '/search',
    
    // Chat
    chat: '/chat',
    chatClear: '/chat/clear',
    
    // Providers
    providers: '/providers',
    providersSelect: '/providers/select',
    modelsRefresh: '/models/refresh',
    
    // Admin
    adminLogin: '/admin/login',
    adminLogout: '/admin/logout',
    adminSettings: '/admin/settings',
    adminSettingsReset: '/admin/settings/reset',
    adminModelsBlock: '/admin/models/block',
    adminProviderToggle: '/admin/provider/toggle',
    adminProviderApiKey: '/admin/provider/apikey',
  },
  
  // Ключ для localStorage
  tokenKey: 'admin_token',
  
  // Параметры
  defaultProvider: 'ollama',
  searchLimit: 15,
  chatHistoryLimit: 10,
};

export default config;