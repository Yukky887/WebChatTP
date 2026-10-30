import React, { useState, useRef } from 'react';
import { Box, TextField, Button, Typography, Chip, IconButton } from '@mui/material';
import { Send as SendIcon, AddPhotoAlternate as AddPhotoIcon, Close as CloseIcon } from '@mui/icons-material';
import { fileToDataUri, pickImageFiles, MAX_ATTACHMENTS, MAX_IMAGE_URI_LEN } from '../../utils/image';

interface ChatInputProps {
  loading: boolean;
  disabled: boolean;
  selectedProgram: string | null;
  onProgramToggle: (program: string) => void;
  onSend: (text: string, attachments: string[], useWeb: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  loading,
  disabled,
  selectedProgram,
  onProgramToggle,
  onSend,
}) => {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [useWeb, setUseWeb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!value.trim() && attachments.length === 0) || loading || disabled) return;
    onSend(value.trim(), attachments, useWeb);
    setValue('');
    setAttachments([]);
    setAttachError(null);
  };

  /** Файлы -> сжатые data URI (максимум MAX_ATTACHMENTS) */
  const handleFiles = async (files: FileList | File[] | null) => {
    const images = pickImageFiles(files, MAX_ATTACHMENTS - attachments.length);
    if (!images.length) return;
    setAttachError(null);

    const uris: string[] = [];
    for (const file of images) {
      try {
        const uri = await fileToDataUri(file);
        if (uri.length > MAX_IMAGE_URI_LEN) {
          setAttachError('Изображение слишком большое');
          continue;
        }
        uris.push(uri);
      } catch (e) {
        console.error('Ошибка обработки изображения:', e);
        setAttachError('Не удалось обработать изображение');
      }
    }
    if (uris.length + attachments.length >= MAX_ATTACHMENTS) {
      setAttachError(`Максимум ${MAX_ATTACHMENTS} изображений на сообщение`);
    }
    setAttachments((prev) => [...prev, ...uris].slice(0, MAX_ATTACHMENTS));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = Array.from(e.clipboardData?.files || []);
    if (files.some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      handleFiles(files);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const hasImages = attachments.length > 0;

  return (
    <Box sx={{ px: 2, pb: 2, pt: 1 }}>
      <Box sx={{
        maxWidth: 900,
        mx: 'auto',
      }}>
        {/* ПУЗЫРЬ */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column', 
          bgcolor: 'white',
          borderRadius: 3,
          p: 1.5,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          border: '1px solid #e0e0e0',
          gap: 1,
        }}>
          {/* Превью прикреплённых изображений */}
          {hasImages && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {attachments.map((uri, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'relative',
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <Box
                    component="img"
                    src={uri}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeAttachment(i)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      p: 0.25,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {/* Ошибка вложений */}
          {attachError && (
            <Typography variant="caption" color="error" sx={{ px: 1 }}>
              {attachError}
            </Typography>
          )}

          {/* Текстовое поле */}
          <TextField
            fullWidth
            multiline
            maxRows={6}
            placeholder={
              disabled 
                ? "Выберите модель..."
                : hasImages
                  ? "Вопрос по изображению (можно пусто)..."
                  : "Задайте вопрос..."
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onPaste={handlePaste}
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

          {/* Нижняя строка: кнопки программы слева, attach + Send справа */}
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
              {!hasImages && (
                <Chip
                  label="🌐 Умный поиск"
                  onClick={() => setUseWeb((w) => !w)}
                  size="small"
                  color={useWeb ? 'success' : 'default'}
                  variant={useWeb ? 'filled' : 'outlined'}
                  sx={{
                    cursor: 'pointer',
                    fontWeight: useWeb ? 600 : 400,
                    borderRadius: 1.5,
                    bgcolor: useWeb ? 'success.main' : 'transparent',
                    color: useWeb ? 'white' : 'text.secondary',
                    marginLeft: '4px',
                    '&:hover': {
                      bgcolor: useWeb ? 'success.dark' : 'rgba(0,0,0,0.04)',
                    },
                  }}
                />
              )}
            </Box>

            {/* Кнопка прикрепления + отправка — справа */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = '';  // повторный выбор того же файла тоже работает
                }}
              />
              <IconButton
                size="small"
                title="Прикрепить изображение (или Ctrl+V)"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || disabled || attachments.length >= MAX_ATTACHMENTS}
                sx={{
                  color: hasImages ? 'primary.main' : 'text.secondary',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                }}
              >
                <AddPhotoIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={loading || disabled || (!value.trim() && !hasImages)}
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
          {hasImages
            ? '🖼 Изображения уйдут через Gemini Vision (облачно)'
            : useWeb
              ? '🌐 Умный поиск включён — модель дополнительно посмотрит в интернете'
              : 'Enter — отправить | Shift+Enter — новая строка'}
        </Typography>
      </Box>
    </Box>
  );
};
