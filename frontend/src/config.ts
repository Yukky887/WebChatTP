const API_BASE_URL = 
  process.env.REACT_APP_API_URL || '/api';

// Версия приложения — меняется руками при выпуске значимых фич (semver):
// 1.1.0 — история чатов с авто-тайтлами, фикс истории для leha
// 1.2.0 — vision (картинки в чате), источники-в-пузыре, группировка истории
export const APP_VERSION = '1.2.0';

export const config = {
  apiBaseUrl: API_BASE_URL,
  appVersion: APP_VERSION,
  
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
    adminSearchSettings: '/admin/search-settings',
  },
  
  // Ключ для localStorage
  tokenKey: 'admin_token',
  
  // Параметры
  defaultProvider: 'ollama',
  searchLimit: 15,
  chatHistoryLimit: 10,
};

export default config;