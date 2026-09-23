import client from './client';

export interface ChatSessionInfo {
  id: string;
  provider_id: string;
  selected_program: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  program_id: string | null;
  created_at: string;
}

export const sessionsApi = {
  async getAll(): Promise<ChatSessionInfo[]> {
    const response = await client.get('/sessions');
    return response.data;
  },

  async getMessages(sessionId: string): Promise<SessionMessage[]> {
    const response = await client.get(`/sessions/${sessionId}/messages`);
    return response.data;
  },

  async delete(sessionId: string): Promise<void> {
    await client.delete(`/sessions/${sessionId}`);
  },
};