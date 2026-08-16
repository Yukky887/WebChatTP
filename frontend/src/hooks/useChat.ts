import { useState, useCallback, useRef } from 'react';
import { Message, ChatResponse } from '../types';
import { chatApi } from '../api/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Для прокрутки вниз
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const send = useCallback(async (
    text: string,
    provider: string,
    model: string
  ) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await chatApi.send({
        message: text,
        provider,
        model,
        session_id: sessionId || undefined,
      });

      setSessionId(response.session_id);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        suggestions: response.suggestions,
        hasQuestions: response.has_questions,
        sources: response.sources,
        truncated: response.truncated,
        usage: response.usage,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Прокручиваем вниз после добавления сообщения
      setTimeout(scrollToBottom, 100);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.detail || e?.message || 'Ошибка при обращении к LLM';
      setError(errorMsg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `${errorMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, scrollToBottom]);

  const clear = useCallback(async () => {
    if (sessionId) {
      try {
        await chatApi.clear(sessionId);
      } catch (e) {
        console.error('Clear chat error:', e);
      }
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, [sessionId]);

  return {
    messages,
    loading,
    sessionId,
    error,
    send,
    clear,
    messagesEndRef,
    scrollToBottom,
  };
};