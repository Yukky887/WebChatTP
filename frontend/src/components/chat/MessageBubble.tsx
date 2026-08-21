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
      </Box>

      {isUser && (
        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32, ml: 1 }}>
          <PersonIcon sx={{ fontSize: 20 }} />
        </Avatar>
      )}
    </Box>
  );
};