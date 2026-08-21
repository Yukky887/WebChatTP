import React from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { QuestionAnswer as QuestionIcon } from '@mui/icons-material';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ProgramButtons } from './ProgramButtons';

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  selectedModel: string;
  selectedProgram: string | null;
  messagesEndRef: any;
  onCopy: (text: string) => void;
  onSuggestionClick: (suggestion: string) => void;
  onProgramSelect: (program: string) => void;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  loading,
  error,
  selectedModel,
  selectedProgram,
  messagesEndRef,
  onCopy,
  onSuggestionClick,
  onProgramSelect,
}) => {
  const hasProgramSelection = messages.some(m => m.needsProgramSelection);
  
  return (
    <Box className="chat-messages">
      {messages.length === 0 && !hasProgramSelection ? (
        <Box className="chat-empty">
          <QuestionIcon className="chat-empty-icon" />
          <Typography variant="body1" gutterBottom>
            Задайте вопрос по документации
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!selectedModel ? 'Сначала выберите модель LLM' : 'Ассистент найдёт ответ'}
          </Typography>
        </Box>
      ) : (
        <>
          {/* Сообщения (без needsProgramSelection) */}
          {messages
            .filter(msg => !msg.needsProgramSelection)
            .map((msg, idx) => (
              <MessageBubble
                key={idx}
                message={msg}
                onCopy={onCopy}
                onSuggestionClick={onSuggestionClick}
              />
            ))
          }
          
          {/* Кнопки выбора программы */}
          {hasProgramSelection && !selectedProgram && (
            <ProgramButtons onSelect={onProgramSelect} />
          )}
          
          {/* Индикатор загрузки */}
          {loading && (
            <Box className="chat-loading">
              <CircularProgress size={20} />
              <Typography variant="body2">Ассистент думает...</Typography>
            </Box>
          )}
          
          {/* Ошибка */}
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </>
      )}
      
      <div ref={messagesEndRef} />
    </Box>
  );
};