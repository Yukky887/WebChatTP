import React, { useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, IconButton, Chip, Divider,
  CircularProgress, Tooltip,
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
    send, clear, messagesEndRef,
  } = useChat();

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
    send(suggestion, currentProvider, selectedModel);
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
            <IconButton onClick={clear} size="small">
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

      {/* Messages */}
      <Box className="chat-messages" ref={messagesEndRef}>
        {messages.length === 0 ? (
          <Box className="chat-empty">
            <QuestionIcon className="chat-empty-icon" />
            <Typography variant="body1" gutterBottom>
              Задайте вопрос по документации
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!selectedModel
                ? 'Сначала выберите модель LLM'
                : 'Ассистент найдёт ответ в заявках ТП и документации'}
            </Typography>
          </Box>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              onCopy={handleCopy}
              onSuggestionClick={handleSuggestion}
            />
          ))
        )}

        {loading && (
          <Box className="chat-loading">
            <CircularProgress size={20} />
            <Typography variant="body2">
              Ассистент думает...
            </Typography>
          </Box>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Input */}
      <Box className="chat-input-area">
        <MessageInput
          loading={loading}
          disabled={!selectedModel}
          onSend={(text) => send(text, currentProvider, selectedModel)}
        />
      </Box>
    </Card>
  );
};