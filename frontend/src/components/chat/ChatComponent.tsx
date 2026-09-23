import React, { useEffect, useState, useCallback } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Clear as ClearIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useProviders } from '../../hooks/useProviders';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ProviderSelector } from './ProviderSelector';
import { UserMenu } from '../UserMenu';
import { sessionsApi } from '../../api/sessions';  // ← ДОБАВЬ

interface ChatComponentProps {
  currentSessionId?: string | null;
  onSessionChange?: () => void;
}

export const ChatComponent: React.FC<ChatComponentProps> = ({
  currentSessionId,
  onSessionChange,
}) => {
  const navigate = useNavigate();
  const {
    messages, loading, error,
    send, clear, messagesEndRef, removeProgramSelection,
    setMessages, setSessionId,  // ← ДОБАВЬ из useChat
  } = useChat();

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const {
    providers, currentProvider, selectedModel,
    loading: providersLoading,
    setCurrentProvider, setSelectedModel,
  } = useProviders();

  // Загрузка сессии при изменении currentSessionId
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    } else {
      clear();
      setSelectedProgram(null);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // Загрузка сообщений сессии из БД
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      console.log('📥 Загрузка сессии:', sessionId);
      const loadedMessages = await sessionsApi.getMessages(sessionId);
      
      // Преобразуем в формат Message
      const formattedMessages = loadedMessages.map(m => ({
        role: m.role,
        content: m.content,
        sources: [],
      }));
      
      setMessages(formattedMessages);
      setSessionId(sessionId);
      
      // Определяем программу из последнего сообщения
      const lastWithProgram = [...loadedMessages].reverse().find(m => m.program_id);
      if (lastWithProgram?.program_id) {
        setSelectedProgram(lastWithProgram.program_id);
      }
    } catch (e) {
      console.error('❌ Load session error:', e);
    }
  }, [setMessages, setSessionId]);

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);

  const handleSuggestion = (s: string) => {
    send(s, currentProvider, selectedModel, selectedProgram || undefined);
  };

  // Выбор программы после уточнения
  const handleProgramSelect = async (program: string) => {
    setSelectedProgram(program);
    removeProgramSelection();
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await send(lastUser.content, currentProvider, selectedModel, program, true);
      onSessionChange?.();  // Обновить список сессий
    }
  };

  // Переключение программы в поле ввода
  const handleProgramToggle = (program: string) => {
    setSelectedProgram(prev => prev === program ? null : program);
  };

  const handleSend = async (text: string) => {
    await send(text, currentProvider, selectedModel, selectedProgram || undefined);
    onSessionChange?.();  // Обновить список сессий
  };

  const handleClear = () => {
    setSelectedProgram(null);
    clear();
    onSessionChange?.();
  };

  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 0,
    }}>
      {/* Прозрачный топ-бар */}
      <Box sx={{
        px: 3, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 1,
        flexShrink: 0,
        justifyContent: 'center',
        position: 'relative',
      }}>
        <ProviderSelector
          providers={providers}
          currentProvider={currentProvider}
          selectedModel={selectedModel}
          loading={providersLoading}
          onProviderChange={setCurrentProvider}
          onModelChange={setSelectedModel}
        />

        <Box sx={{
          position: 'absolute', right: 16, top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', gap: 0.5, alignItems: 'center',
        }}>
          <UserMenu />
          <Tooltip title="Очистить чат">
            <IconButton
              onClick={handleClear}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
              }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Админка">
            <IconButton
              onClick={() => navigate('/admin')}
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(8px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Сообщения */}
      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <ChatMessages
          messages={messages}
          loading={loading}
          error={error}
          selectedModel={selectedModel}
          selectedProgram={selectedProgram}
          messagesEndRef={messagesEndRef}
          onCopy={handleCopy}
          onSuggestionClick={handleSuggestion}
          onProgramSelect={handleProgramSelect}
        />
      </Box>

      {/* Поле ввода */}
      <Box sx={{ flexShrink: 0 }}>
        <ChatInput
          loading={loading}
          disabled={!selectedModel}
          selectedProgram={selectedProgram}
          onProgramToggle={handleProgramToggle}
          onSend={handleSend}
        />
      </Box>
    </Box>
  );
};