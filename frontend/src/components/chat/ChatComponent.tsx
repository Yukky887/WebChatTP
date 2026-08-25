import React, { useEffect, useState } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Clear as ClearIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../hooks/useChat';
import { useProviders } from '../../hooks/useProviders';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ProviderSelector } from './ProviderSelector';

export const ChatComponent: React.FC = () => {
  const navigate = useNavigate();
  const {
    messages, loading, error,
    send, clear, messagesEndRef, removeProgramSelection,
  } = useChat();

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const {
    providers, currentProvider, selectedModel,
    loading: providersLoading,
    setCurrentProvider, setSelectedModel,
  } = useProviders();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const handleCopy = (text: string) => navigator.clipboard.writeText(text);
  
  const handleSuggestion = (s: string) => {
    send(s, currentProvider, selectedModel, selectedProgram || undefined);
  };
  
  const handleProgramSelect = async (program: string) => {
    setSelectedProgram(program);
    removeProgramSelection();
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await send(lastUser.content, currentProvider, selectedModel, program, true);
    }
  };
  
  // Переключение программы (клик — выбрать, повторный клик — сбросить)
  const handleProgramToggle = (program: string) => {
    setSelectedProgram(prev => {
      if (prev === program) {
        console.log('🔄 Сброс программы:', program);
        return null;
      } else {
        console.log('✅ Выбор программы:', program);
        return program;
      }
    });
  };
  
  const handleSend = (text: string) => {
    send(text, currentProvider, selectedModel, selectedProgram || undefined);
  };
  
  const handleClear = () => { 
    setSelectedProgram(null); 
    clear(); 
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
          display: 'flex', gap: 0.5,
        }}>
          <Tooltip title="Очистить чат">
            <IconButton onClick={handleClear} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' } }}
            >
              <ClearIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Админка">
            <IconButton onClick={() => navigate('/admin')} size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', '&:hover': { bgcolor: 'rgba(255,255,255,1)' } }}
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

      {/* Поле ввода с кнопками программы */}
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