import client from './client';
import { SearchResponse } from '../types';
import config from '../config';

export const searchApi = {
  /** Поиск по всем коллекциям */
  async search(query: string, limit?: number): Promise<SearchResponse> {
    const response = await client.post<SearchResponse>(config.endpoints.search, {
      query,
      limit: limit || config.searchLimit,
    });
    return response.data;
  },
};