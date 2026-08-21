import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Chip, Divider,
  CircularProgress, Tooltip, Button,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';
import { useChat } from '../../hooks/useChat';
import { useProviders } from '../../hooks/useProviders';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ProviderSelector } from './ProviderSelector';

export const ChatComponent: React.FC = () => {
  const {
    messages, loading, sessionId, error,
    send, clear, messagesEndRef, removeProgramSelection,
  } = useChat();

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [pendingProgramSelection, setPendingProgramSelection] = useState<boolean>(false);

  const {
    providers, currentProvider, selectedModel,
    loading: providersLoading,
    setCurrentProvider, setSelectedModel, refresh,
  } = useProviders();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSuggestion = (suggestion: string) => {
    send(suggestion, currentProvider, selectedModel, selectedProgram || undefined);
  };

  // Обработчик выбора программы
  const handleProgramSelect = async (program: string) => {
    setSelectedProgram(program);
    setPendingProgramSelection(false); 
    
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    
    if (lastUserMessage) {
      // Удаляем сообщение с кнопками
      removeProgramSelection();
      
      // Отправляем запрос
      await send(lastUserMessage.content, currentProvider, selectedModel, program, true);
    }
  };

  // Отправка из поля ввода
  const handleSend = (text: string) => {
    send(text, currentProvider, selectedModel, selectedProgram || undefined);
  };

  const handleClear = () => {
    setSelectedProgram(null);
    setPendingProgramSelection(false);
    clear();
  };

  return (
    <Card className="chat-container">
      {/* Header */}
      <Box className="chat-header">
        <Box className="chat-header-title">
          <AIIcon color="primary" />
          Чат с ассистентом
          {messages.length > 0 && (
            <Chip label={`${messages.length} сообщ.`} size="small" variant="outlined" />
          )}
        </Box>
        <Box className="chat-header-actions">
          {sessionId && (
            <Chip label={`ID: ${sessionId.slice(0, 8)}`} size="small" variant="outlined" />
          )}
          <Tooltip title="Обновить модели">
            <IconButton onClick={refresh} size="small" disabled={providersLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Очистить чат">
            <IconButton onClick={handleClear} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Provider Selector */}
      <Box sx={{ p: 1, borderBottom: '1px solid #eee' }}>
        <ProviderSelector
          providers={providers}
          currentProvider={currentProvider}
          selectedModel={selectedModel}
          loading={providersLoading}
          onProviderChange={setCurrentProvider}
          onModelChange={setSelectedModel}
        />
      </Box>

      {/* Выбранная программа */}
      {selectedProgram && (
        <Box sx={{ p: 1, bgcolor: '#f0f7ff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">
            Программа: <strong>{selectedProgram === 'intellect' ? '🧠 Parts.Intellect' : '🔧 Parts.Resource'}</strong>
          </Typography>
          <Chip
            label="Сбросить"
            size="small"
            variant="outlined"
            onClick={() => setSelectedProgram(null)}
            sx={{ cursor: 'pointer', ml: 1 }}
          />
        </Box>
      )}

      {/* Messages */}
      <Box className="chat-messages">
        {messages.length === 0 ? (
          <Box className="chat-empty">
            <QuestionIcon className="chat-empty-icon" />
            <Typography variant="body1" gutterBottom>
              Задайте вопрос по документации
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!selectedModel ? 'Сначала выберите модель LLM' : 'Ассистент найдёт ответ'}
            </Typography>
          </Box>
        ) : (
          messages.map((msg, idx) => {
            // Если это запрос выбора программы — показываем только кнопки
            if (msg.needsProgramSelection && idx === messages.length - 1) {
              return (
                <Box key={idx} sx={{ display: 'flex', gap: 1, ml: 5, mt: 1, mb: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleProgramSelect('intellect')}
                  >
                    🧠 Parts.Intellect
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    onClick={() => handleProgramSelect('resource')}
                  >
                    🔧 Parts.Resource
                  </Button>
                </Box>
              );
            }

            // Обычное сообщение
            return (
              <MessageBubble
                key={idx}
                message={msg}
                onCopy={handleCopy}
                onSuggestionClick={handleSuggestion}
              />
            );
          })
        )}

        {loading && (
          <Box className="chat-loading">
            <CircularProgress size={20} />
            <Typography variant="body2">Ассистент думает...</Typography>
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input */}
      <Box className="chat-input-area">
        <MessageInput
          loading={loading}
          disabled={!selectedModel}
          onSend={handleSend}
        />
      </Box>
    </Card>
  );
};