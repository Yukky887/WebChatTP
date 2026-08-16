import client from './client';
import { ChatRequest, ChatResponse } from '../types';
import config from '../config';

export const chatApi = {
  /** Отправить сообщение */
  async send(request: ChatRequest): Promise<ChatResponse> {
    const response = await client.post<ChatResponse>(config.endpoints.chat, request);
    return response.data;
  },

  /** Очистить историю чата */
  async clear(sessionId: string): Promise<void> {
    await client.post(config.endpoints.chatClear, null, {
      params: { session_id: sessionId },
    });
  },
};