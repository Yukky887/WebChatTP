import client from './client';
import { ProvidersResponse } from '../types';
import config from '../config';

export const providersApi = {
  /** Получить всех провайдеров */
  async getAll(): Promise<ProvidersResponse> {
    const response = await client.get<ProvidersResponse>(config.endpoints.providers);
    return response.data;
  },

  /** Выбрать провайдера и модель */
  async select(provider: string, model?: string): Promise<void> {
    await client.post(config.endpoints.providersSelect, null, {
      params: { provider, model },
    });
  },

  /** Обновить список моделей */
  async refreshModels(): Promise<void> {
    await client.get(config.endpoints.modelsRefresh);
  },
};