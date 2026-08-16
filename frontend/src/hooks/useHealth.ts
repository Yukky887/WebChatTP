import { useState, useEffect, useCallback } from 'react';
import { HealthStatus } from '../types';
import { healthApi } from '../api/health';

export const useHealth = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthApi.get();
      setHealth(data);
    } catch (e: any) {
      setError(e?.message || 'Ошибка проверки здоровья');
      console.error('Health check failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Автопроверка при монтировании
  useEffect(() => {
    check();
  }, [check]);

  // Периодическая проверка каждые 30 секунд
  useEffect(() => {
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { health, loading, error, refresh: check };
};