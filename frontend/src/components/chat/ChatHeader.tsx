import React from 'react';
import { Box, Typography, IconButton, Chip, Tooltip } from '@mui/material';
import { Clear as ClearIcon, Refresh as RefreshIcon, Psychology as AIIcon } from '@mui/icons-material';

interface ChatHeaderProps {
  messagesCount: number;
  sessionId: string | null;
  loading: boolean;
  onRefresh: () => void;
  onClear: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  messagesCount,
  sessionId,
  loading,
  onRefresh,
  onClear,
}) => {
  return (
    <Box className="chat-header">
      <Box className="chat-header-title">
        <AIIcon color="primary" />
        Чат с ассистентом
        {messagesCount > 0 && (
          <Chip label={`${messagesCount} сообщ.`} size="small" variant="outlined" />
        )}
      </Box>
      <Box className="chat-header-actions">
        {sessionId && (
          <Chip label={`ID: ${sessionId.slice(0, 8)}`} size="small" variant="outlined" />
        )}
        <Tooltip title="Обновить модели">
          <IconButton onClick={onRefresh} size="small" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Очистить чат">
          <IconButton onClick={onClear} size="small">
            <ClearIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};