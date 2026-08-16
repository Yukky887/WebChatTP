import { useState, useCallback, useEffect } from 'react';
import { Provider } from '../types';
import { providersApi } from '../api/providers';

export const useProviders = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentProvider, setCurrentProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await providersApi.getAll();
      setProviders(response.providers);
      setCurrentProvider(response.current_provider);
      setSelectedModel(response.current_model);
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки провайдеров');
      console.error('Providers error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProvider = useCallback(async (provider: string) => {
    // Находим первую модель провайдера
    const prov = providers.find(p => p.id === provider);
    const model = prov?.models?.[0] || '';
    
    setCurrentProvider(provider);
    setSelectedModel(model);
    
    try {
      await providersApi.select(provider, model || undefined);
    } catch (e) {
      console.error('Select provider error:', e);
    }
  }, [providers]);

  const selectModel = useCallback(async (model: string) => {
    setSelectedModel(model);
    try {
      await providersApi.select(currentProvider, model);
    } catch (e) {
      console.error('Select model error:', e);
    }
  }, [currentProvider]);

  const refresh = useCallback(async () => {
    await load();
  }, [load]);

  // Загрузка при монтировании
  useEffect(() => {
    load();
  }, [load]);

  return {
    providers,
    currentProvider,
    selectedModel,
    loading,
    error,
    setCurrentProvider: selectProvider,
    setSelectedModel: selectModel,
    refresh,
  };
};