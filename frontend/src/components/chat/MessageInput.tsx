import React, { useState, useCallback } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface MessageInputProps {
  loading: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
  placeholder?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  loading,
  disabled,
  onSend,
  placeholder = 'Задайте вопрос...',
}) => {
  const [input, setInput] = useState('');

  const handleSend = useCallback(() => {
    if (!input.trim() || loading || disabled) return;
    onSend(input.trim());
    setInput('');
  }, [input, loading, disabled, onSend]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box>
      <Box className="chat-input-row">
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={disabled ? 'Сначала выберите модель' : placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading || disabled}
          size="small"
          variant="outlined"
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || disabled || !input.trim()}
          sx={{ minWidth: 50 }}
        >
          <SendIcon />
        </Button>
      </Box>
      <Typography className="chat-input-hint">
        Enter — отправить, Shift+Enter — новая строка
      </Typography>
    </Box>
  );
};