import React from 'react';
import { Box, Paper, Typography, IconButton, Tooltip, Avatar } from '@mui/material';
import { Person as PersonIcon, Psychology as AIIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import { Message, Source } from '../../types';
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

  if (isUser) {
    // ========== СООБЩЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
    return (
      <Box sx={{ 
        mb: 2.5,
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <Box sx={{ 
          bgcolor: '#1976d2',
          color: 'white',
          borderRadius: 3,
          borderBottomRightRadius: 0.5,
          px: 2.5,
          py: 2,
          maxWidth: '70%',
          width: 'fit-content',
          wordBreak: 'break-word',
        }}>
          <Typography sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.6,
            fontSize: '0.95rem',
          }}>
            {message.content}
          </Typography>
        </Box>
      </Box>
    );
  }

  // ========== СООБЩЕНИЕ АССИСТЕНТА — НА ВСЮ ШИРИНУ ==========
  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Заголовок ассистента */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        mb: 0.5,
      }}>
        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
          <AIIcon sx={{ fontSize: 14 }} />
        </Avatar>
        <Typography variant="caption" sx={{ fontWeight: 600, color: '#333' }}>
          Ассистент
        </Typography>
      </Box>

      {/* Контент — во всю ширину */}
      <Box sx={{ 
        bgcolor: 'white',
        borderRadius: 3,
        borderTopLeftRadius: 0.5,
        px: 3,
        py: 2.5,
        width: '100%',  // ← ВО ВСЮ ШИРИНУ
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.04)',
      }}>
        <Box sx={{
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}>
          <MarkdownRenderer content={message.content} />
        </Box>

        {/* Кнопка копирования */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
          <Tooltip title="Копировать">
            <IconButton size="small" onClick={() => onCopy(message.content)}>
              <CopyIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Источники — под сообщением */}
      {message.sources && message.sources.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 0.5,
          mt: 0.5,
        }}>
          {message.sources.map((source: Source) => (
            <SourceChip key={source.index} source={source} />
          ))}
        </Box>
      )}
    </Box>
  );
};