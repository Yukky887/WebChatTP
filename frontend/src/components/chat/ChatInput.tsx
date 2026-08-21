import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputProps {
  loading: boolean;
  disabled: boolean;
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ loading, disabled, onSend }) => {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || loading || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <Box className="chat-input-area">
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          placeholder={disabled ? "Сначала выберите модель" : "Задайте вопрос..."}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading || disabled}
          size="small"
        />
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || disabled || !value.trim()}
          sx={{ minWidth: 50 }}
        >
          <SendIcon />
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Enter — отправить, Shift+Enter — новая строка
      </Typography>
    </Box>
  );
};