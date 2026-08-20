import React from 'react';
import {
  Box, Paper, IconButton, Chip, Tooltip, Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Psychology as AIIcon,
  ContentCopy as CopyIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Message } from '../../types';
import { formatTokens, formatCost } from '../../utils/formatters';
import { SourceChip } from './SourceChip';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

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

      <Box sx={{ maxWidth: '85%' }}>
        <Paper
          className={`message-bubble ${isUser ? 'message-bubble-user' : 'message-bubble-assistant'}`}
          elevation={isUser ? 0 : 1}
        >
          <Box className="message-content">
            {isUser ? (
              <Box component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Box>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
          </Box>

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
            <Tooltip title={`Вход: ${formatTokens(message.usage.prompt_tokens)} | Выход: ${formatTokens(message.usage.completion_tokens)}`}>
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
              <Tooltip title="Ответ обрезан">
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
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', mr: 1 }}>
              🤔 Уточните:
            </Box>
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