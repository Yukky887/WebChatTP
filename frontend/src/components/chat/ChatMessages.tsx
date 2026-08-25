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
  messages, loading, error, selectedModel, selectedProgram,
  messagesEndRef, onCopy, onSuggestionClick, onProgramSelect,
}) => {
  const hasProgramSelection = messages.some(m => m.needsProgramSelection);
  
  return (
    <Box sx={{ 
      py: 3,
      px: 2,
      maxWidth: 850,
      width: '100%',
      mx: 'auto',
      minHeight: '100%',
    }}>
      {messages.length === 0 && !hasProgramSelection ? (
        <Box sx={{ 
          textAlign: 'center', 
          py: 10, 
          color: 'text.secondary',
        }}>
          <QuestionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h5" gutterBottom sx={{ color: '#333', fontWeight: 500 }}>
            Чем могу помочь?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {!selectedModel 
              ? 'Выберите модель LLM в настройках'
              : 'Задайте вопрос по работе с Parts.Intellect или Parts.Resource'}
          </Typography>
        </Box>
      ) : (
        <>
          {messages
            .filter(msg => !msg.needsProgramSelection)
            .map((msg, idx) => (
              <MessageBubble key={idx} message={msg} onCopy={onCopy} onSuggestionClick={onSuggestionClick} />
            ))
          }
          
          {hasProgramSelection && !selectedProgram && (
            <ProgramButtons onSelect={onProgramSelect} />
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                Ассистент думает...
              </Typography>
            </Box>
          )}
          
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