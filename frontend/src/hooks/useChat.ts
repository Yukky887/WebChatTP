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
    model: string,
    program?: string,
    skipUserMessage?: boolean,
  ) => {
    if (!text.trim() || loading) return;

    if (!skipUserMessage) {
      const userMessage: Message = { role: 'user', content: text };
      setMessages(prev => [...prev, userMessage]);
    }

    setLoading(true);
    setError(null);

    try {
      const response: ChatResponse = await chatApi.send({
        message: text,
        provider,
        model,
        session_id: sessionId || undefined,
        program,
      });

      setSessionId(response.session_id);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer || '',
        sources: response.sources,
        needsProgramSelection: response.needs_program_selection || false, 
        program: response.program,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setTimeout(scrollToBottom, 100);

    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Ошибка при обращении к LLM');
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, scrollToBottom]);

  const removeMessage = useCallback((index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeProgramSelection = useCallback(() => {
    setMessages(prev => prev.filter(m => !m.needsProgramSelection));
  }, []);

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
    removeMessage,
    removeProgramSelection,
  };
};