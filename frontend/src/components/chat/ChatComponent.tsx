import React, { useEffect, useState } from 'react';
import { Card, Box } from '@mui/material';
import { useChat } from '../../hooks/useChat';
import { useProviders } from '../../hooks/useProviders';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ProviderSelector } from './ProviderSelector';
import { ProgramBadge } from './ProgramBadge';

export const ChatComponent: React.FC = () => {
  const {
    messages, loading, sessionId, error,
    send, clear, messagesEndRef, removeProgramSelection,
  } = useChat();

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  const {
    providers, currentProvider, selectedModel,
    loading: providersLoading,
    setCurrentProvider, setSelectedModel, refresh,
  } = useProviders();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSuggestion = (suggestion: string) => {
    send(suggestion, currentProvider, selectedModel, selectedProgram || undefined);
  };

  const handleProgramSelect = async (program: string) => {
    setSelectedProgram(program);
    removeProgramSelection();
    
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      await send(lastUser.content, currentProvider, selectedModel, program, true);
    }
  };

  const handleSend = (text: string) => {
    send(text, currentProvider, selectedModel, selectedProgram || undefined);
  };

  const handleClear = () => {
    setSelectedProgram(null);
    clear();
  };

  return (
    <Card className="chat-container">
      <ChatHeader
        messagesCount={messages.length}
        sessionId={sessionId}
        loading={providersLoading}
        onRefresh={refresh}
        onClear={handleClear}
      />

      <Box sx={{ p: 1, borderBottom: '1px solid #eee' }}>
        <ProviderSelector
          providers={providers}
          currentProvider={currentProvider}
          selectedModel={selectedModel}
          loading={providersLoading}
          onProviderChange={setCurrentProvider}
          onModelChange={setSelectedModel}
        />
      </Box>

      <ProgramBadge
        program={selectedProgram}
        onReset={() => setSelectedProgram(null)}
      />

      <ChatMessages
        messages={messages}
        loading={loading}
        error={error}
        selectedModel={selectedModel}
        selectedProgram={selectedProgram}
        messagesEndRef={messagesEndRef}
        onCopy={handleCopy}
        onSuggestionClick={handleSuggestion}
        onProgramSelect={handleProgramSelect}
      />

      <ChatInput
        loading={loading}
        disabled={!selectedModel}
        onSend={handleSend}
      />
    </Card>
  );
};