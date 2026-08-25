import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Chip } from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

interface ChatInputProps {
  loading: boolean;
  disabled: boolean;
  selectedProgram: string | null;
  onProgramToggle: (program: string) => void;
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  loading,
  disabled,
  selectedProgram,
  onProgramToggle,
  onSend,
}) => {
  const [value, setValue] = useState('');

  const handleSend = () => {
    if (!value.trim() || loading || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  return (
    <Box sx={{ px: 2, pb: 2, pt: 1 }}>
      <Box sx={{
        maxWidth: 900,
        mx: 'auto',
      }}>
        {/* ПУЗЫРЬ */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',  // ← Колонка: текст сверху, кнопки + send снизу
          bgcolor: 'white',
          borderRadius: 3,
          p: 1.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          gap: 1,
        }}>
          {/* Текстовое поле */}
          <TextField
            fullWidth
            multiline
            maxRows={6}
            placeholder={
              disabled 
                ? "Выберите модель..."
                : "Задайте вопрос..."
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading || disabled}
            variant="standard"
            sx={{
              '& .MuiInput-underline:before': { display: 'none' },
              '& .MuiInput-underline:after': { display: 'none' },
              '& .MuiInputBase-root': { p: 1, fontSize: '0.95rem' },
            }}
          />

          {/* Нижняя строка: кнопки программы слева, Send справа */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}>
            {/* Кнопки программ — слева */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                label="🧠 Intellect"
                onClick={() => onProgramToggle('intellect')}
                size="small"
                color={selectedProgram === 'intellect' ? 'primary' : 'default'}
                variant={selectedProgram === 'intellect' ? 'filled' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  fontWeight: selectedProgram === 'intellect' ? 600 : 400,
                  borderRadius: 1.5,
                  bgcolor: selectedProgram === 'intellect' ? 'primary.main' : 'transparent',
                  color: selectedProgram === 'intellect' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: selectedProgram === 'intellect' ? 'primary.dark' : 'rgba(0,0,0,0.04)',
                  },
                }}
              />
              <Chip
                label="🔧 Resource"
                onClick={() => onProgramToggle('resource')}
                size="small"
                color={selectedProgram === 'resource' ? 'secondary' : 'default'}
                variant={selectedProgram === 'resource' ? 'filled' : 'outlined'}
                sx={{ 
                  cursor: 'pointer',
                  fontWeight: selectedProgram === 'resource' ? 600 : 400,
                  borderRadius: 1.5,
                  bgcolor: selectedProgram === 'resource' ? 'secondary.main' : 'transparent',
                  color: selectedProgram === 'resource' ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: selectedProgram === 'resource' ? 'secondary.dark' : 'rgba(0,0,0,0.04)',
                  },
                }}
              />
            </Box>

            {/* Кнопка отправки — справа */}
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={loading || disabled || !value.trim()}
              sx={{ 
                minWidth: 40, 
                height: 40, 
                borderRadius: 2,
                flexShrink: 0,
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </Button>
          </Box>
        </Box>

        <Typography 
          variant="caption" 
          color="text.secondary"
          sx={{ 
            display: 'block', 
            textAlign: 'center', 
            mt: 0.5,
            fontSize: '0.7rem',
          }}
        >
          Enter — отправить | Shift+Enter — новая строка
        </Typography>
      </Box>
    </Box>
  );
};