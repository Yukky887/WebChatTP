import { useState, useCallback } from 'react';
import { SearchResult } from '../types';
import { searchApi } from '../api/search';

export const useSearch = () => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [total, setTotal] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);

  const search = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setQuery(text);
    setLoading(true);
    setError(null);

    try {
      const response = await searchApi.search(text);
      setResults(response.results);
      setTotal(response.total);
      setTicketsCount(response.tickets_count);
      setDocsCount(response.docs_count);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.detail || e?.message || 'Ошибка поиска';
      setError(errorMsg);
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setQuery('');
    setTotal(0);
    setTicketsCount(0);
    setDocsCount(0);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    total,
    ticketsCount,
    docsCount,
    search,
    clear,
  };
};