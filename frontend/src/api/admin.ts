import client from './client';
import { 
  AdminSettingsResponse, 
  LLMSettings, 
  LoginResponse, 
  SearchSettings
} from '../types';
import config from '../config';

export const adminApi = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await client.post<LoginResponse>('/auth/login', { 
      username, 
      password 
    });
    return response.data;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(config.tokenKey);
  },

  async getSettings(): Promise<AdminSettingsResponse> {
    const response = await client.get('/admin/settings');
    return response.data;
  },

  async updateSettings(settings: LLMSettings): Promise<void> {
    await client.post('/admin/settings', settings);
  },

  async resetSettings(): Promise<void> {
    await client.post('/admin/settings/reset');
  },

  async updateModels(allowed: string[], favorites: string[]): Promise<void> {
    await client.post('/admin/models/block', { allowed, favorites });
  },

  async toggleProvider(provider: string, enabled: boolean): Promise<void> {
    await client.post('/admin/provider/toggle', null, {
      params: { provider, enabled },
    });
  },

  async setApiKey(provider: string, apiKey: string): Promise<void> {
    await client.post('/admin/provider/apikey', null, {
      params: { provider, api_key: apiKey },
    });
  },

  async getSearchSettings(): Promise<SearchSettings> {
    const response = await client.get('/admin/search-settings');
    return response.data;
  },

  async updateSearchSettings(useTickets: boolean, useDocumentation: boolean): Promise<void> {
    await client.post('/admin/search-settings', null, {
      params: { use_tickets: useTickets, use_documentation: useDocumentation },
    });
  },
};