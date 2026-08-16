import { useState, useCallback, useEffect } from 'react';
import { AdminSettingsResponse, LLMSettings } from '../types';
import { adminApi } from '../api/admin';
import config from '../config';

const getToken = () => localStorage.getItem(config.tokenKey) || '';
const setToken = (token: string) => localStorage.setItem(config.tokenKey, token);
const clearToken = () => localStorage.removeItem(config.tokenKey);

export const useAdmin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);

  // Проверка токена при загрузке
  useEffect(() => {
    const token = getToken();
    if (token) {
      setAuthenticated(true);
    }
  }, []);

  const login = useCallback(async (password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.login(password);
      setToken(response.token);
      setAuthenticated(true);
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Неверный пароль';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const token = getToken();
    if (token) {
      try {
        await adminApi.logout(token);
      } catch (e) {
        console.error('Logout error:', e);
      }
    }
    clearToken();
    setAuthenticated(false);
    setSettings(null);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Ошибка загрузки настроек';
      setError(msg);
      if (e?.response?.status === 401) {
        await logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const saveSettings = useCallback(async (newSettings: LLMSettings) => {
    setLoading(true);
    try {
      await adminApi.updateSettings(newSettings);
      await loadSettings();
      return true;
    } catch (e) {
      console.error('Save settings error:', e);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  const resetSettings = useCallback(async () => {
    setLoading(true);
    try {
      await adminApi.resetSettings();
      await loadSettings();
    } catch (e) {
      console.error('Reset settings error:', e);
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  const updateModels = useCallback(async (allowed: string[], favorites: string[]) => {
    try {
      await adminApi.updateModels(allowed, favorites);
      await loadSettings();
    } catch (e) {
      console.error('Update models error:', e);
    }
  }, [loadSettings]);

  const toggleProvider = useCallback(async (provider: string, enabled: boolean) => {
    try {
      await adminApi.toggleProvider(provider, enabled);
      await loadSettings();
    } catch (e) {
      console.error('Toggle provider error:', e);
    }
  }, [loadSettings]);

  const setApiKey = useCallback(async (provider: string, apiKey: string) => {
    try {
      await adminApi.setApiKey(provider, apiKey);
    } catch (e) {
      console.error('Set API key error:', e);
    }
  }, []);

  return {
    authenticated,
    loading,
    error,
    settings,
    login,
    logout,
    loadSettings,
    saveSettings,
    resetSettings,
    updateModels,
    toggleProvider,
    setApiKey,
  };
};