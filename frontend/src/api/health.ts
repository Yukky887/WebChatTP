import client from './client';
import { HealthStatus } from '../types';
import config from '../config';

export const healthApi = {
  /** Получить статус всех сервисов */
  async get(): Promise<HealthStatus> {
    const response = await client.get<HealthStatus>(config.endpoints.health);
    return response.data;
  },
};