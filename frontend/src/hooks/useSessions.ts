import { useState, useCallback, useEffect } from 'react';
import { sessionsApi, ChatSessionInfo, SessionMessage } from '../api/sessions';

export const useSessions = () => {
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const userToken = localStorage.getItem('user_token');

  const load = useCallback(async () => {
    if (!userToken) {
      setSessions([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await sessionsApi.getAll();
      setSessions(data);
    } catch (e) {
      console.error('Sessions load error:', e);
    } finally {
      setLoading(false);
    }
  }, [userToken]);

  const remove = useCallback(async (sessionId: string) => {
    await sessionsApi.delete(sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, loading, refresh: load, remove };
};