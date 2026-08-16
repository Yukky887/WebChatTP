import client from './client';
import { 
  AdminSettingsResponse, 
  LLMSettings, 
  LoginResponse 
} from '../types';
import config from '../config';

export const adminApi = {
  /** Вход в админку */
  async login(password: string): Promise<LoginResponse> {
    const response = await client.post<LoginResponse>(config.endpoints.adminLogin, {
      password,
    });
    return response.data;
  },

  /** Выход из админки */
  async logout(token: string): Promise<void> {
    await client.post(config.endpoints.adminLogout, null, {
      params: { token },
    });
  },

  /** Получить настройки */
  async getSettings(): Promise<AdminSettingsResponse> {
    const response = await client.get<AdminSettingsResponse>(config.endpoints.adminSettings);
    return response.data;
  },

  /** Обновить настройки LLM */
  async updateSettings(settings: LLMSettings): Promise<void> {
    await client.post(config.endpoints.adminSettings, settings);
  },

  /** Сбросить настройки */
  async resetSettings(): Promise<void> {
    await client.post(config.endpoints.adminSettingsReset);
  },

  /** Обновить белый список моделей */
  async updateModels(allowed: string[], favorites: string[]): Promise<void> {
    await client.post(config.endpoints.adminModelsBlock, {
      allowed,
      favorites,
    });
  },

  /** Включить/выключить провайдера */
  async toggleProvider(provider: string, enabled: boolean): Promise<void> {
    await client.post(config.endpoints.adminProviderToggle, null, {
      params: { provider, enabled },
    });
  },

  /** Установить API ключ */
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    await client.post(config.endpoints.adminProviderApiKey, null, {
      params: { provider, api_key: apiKey },
    });
  },
};