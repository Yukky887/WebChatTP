import React from 'react';
import {
  Box, Paper, Typography, IconButton, Chip, Tooltip, Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Psychology as AIIcon,
  ContentCopy as CopyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Message } from '../../types';
import { formatScore, formatTokens, formatCost, formatLength } from '../../utils/formatters';
import { SourceChip } from './SourceChip';

interface MessageBubbleProps {
  message: Message;
  onCopy: (text: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onSuggestionClick,
}) => {
  const isUser = message.role === 'user';

  return (
    <Box className={`message-row ${isUser ? 'message-row-user' : 'message-row-assistant'}`}>
      {!isUser && (
        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1 }}>
          <AIIcon sx={{ fontSize: 20 }} />
        </Avatar>
      )}

      <Box sx={{ maxWidth: '80%' }}>
        <Paper
          className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}
          elevation={isUser ? 0 : 1}
        >
          <Typography variant="body1" className="message-content">
            {message.content}
          </Typography>

          {!isUser && (
            <Box className="message-actions">
              <Tooltip title="Копировать">
                <IconButton size="small" onClick={() => onCopy(message.content)}>
                  <CopyIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Paper>

        {/* Метрики */}
        {!isUser && message.usage && (
          <Box className="message-meta">
            <Tooltip title={`Токены: ${formatTokens(message.usage.prompt_tokens)} вх + ${formatTokens(message.usage.completion_tokens)} вых`}>
              <Chip
                size="small"
                variant="outlined"
                label={`∑ ${formatTokens(message.usage.total_tokens)} токенов`}
              />
            </Tooltip>
            
            {message.usage.cost > 0 ? (
              <Chip
                size="small"
                color="warning"
                label={formatCost(message.usage.cost)}
              />
            ) : (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label="🆓 Бесплатно"
              />
            )}

            {message.truncated && (
              <Tooltip title="Ответ обрезан из-за ограничения длины">
                <Chip
                  size="small"
                  color="error"
                  icon={<WarningIcon />}
                  label="Обрезан"
                />
              </Tooltip>
            )}
          </Box>
        )}

        {/* Источники */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <Box className="message-sources">
            {message.sources.map((source) => (
              <SourceChip key={source.index} source={source} />
            ))}
          </Box>
        )}

        {/* Уточняющие вопросы */}
        {!isUser && message.hasQuestions && message.suggestions && (
          <Box className="message-suggestions">
            <Typography variant="caption" color="text.secondary">
              🤔 Уточняющие вопросы:
            </Typography>
            {message.suggestions.map((suggestion, idx) => (
              <Chip
                key={idx}
                label={suggestion}
                size="small"
                color="warning"
                variant="outlined"
                onClick={() => onSuggestionClick?.(suggestion)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        )}
      </Box>

      {isUser && (
        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, ml: 1 }}>
          <PersonIcon sx={{ fontSize: 20 }} />
        </Avatar>
      )}
    </Box>
  );
};