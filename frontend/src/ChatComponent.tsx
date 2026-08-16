import React, { useState, useRef, useEffect } from 'react';
import {
  Box, TextField, Button, Paper, Typography, IconButton,
  Chip, Avatar, CircularProgress, Divider, Card, CardContent,
  Link, Tooltip, FormControl, Select, MenuItem,
} from '@mui/material';
import {
  Send as SendIcon, Psychology as AIIcon, Person as PersonIcon,
  Clear as ClearIcon, QuestionAnswer as QuestionIcon,
  ContentCopy as CopyIcon, OpenInNew as LinkIcon,
  Source as SourceIcon, Refresh as RefreshIcon,
  Memory as ServerIcon,
  Cloud as CloudIcon, Computer as ComputerIcon,
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

interface Source {
  index: number;
  type: 'ticket' | 'documentation';
  title: string;
  h1?: string;
  url?: string;
  score: number;
  content_length: number;
  is_truncated?: boolean;
  author?: string;
  date?: string;
  question?: string;
}

interface Provider {
  id: string;
  name: string;
  models: string[];
  available: boolean;
  current: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  hasQuestions?: boolean;
  sources?: Source[];
}

export const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Провайдеры и модели
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentProvider, setCurrentProvider] = useState('ollama');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadProviders();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadProviders = async () => {
    setModelsLoading(true);
    try {
      const resp = await axios.get(`${API_URL}/providers`);
      const provs = resp.data.providers || [];
      setProviders(provs);
      setCurrentProvider(resp.data.current_provider || 'ollama');
      setSelectedModel(resp.data.current_model || '');
    } catch (e) {
      console.error('Providers error:', e);
    }
    setModelsLoading(false);
  };

  const refreshModels = async () => {
    setModelsLoading(true);
    try {
      await axios.get(`${API_URL}/models/refresh`);
      await loadProviders();
    } catch (e) {
      console.error('Refresh error:', e);
    }
    setModelsLoading(false);
  };

  const handleProviderChange = async (provider: string) => {
    setCurrentProvider(provider);
    // Выбираем первую модель провайдера
    const prov = providers.find(p => p.id === provider);
    if (prov && prov.models.length > 0) {
      const model = prov.models[0];
      setSelectedModel(model);
      try {
        await axios.post(`${API_URL}/providers/select?provider=${provider}&model=${model}`);
      } catch (e) {
        console.error('Select error:', e);
      }
    }
  };

  const handleModelChange = async (model: string) => {
    setSelectedModel(model);
    try {
      await axios.post(`${API_URL}/providers/select?provider=${currentProvider}&model=${model}`);
    } catch (e) {
      console.error('Select error:', e);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading || !selectedModel) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        session_id: sessionId,
        message: input,
        use_context: true,
        provider: currentProvider,
        model: selectedModel,
      });

      const data = response.data;
      setSessionId(data.session_id);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        suggestions: data.suggestions,
        hasQuestions: data.has_questions,
        sources: data.sources || [],
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Ошибка при обращении к LLM. Попробуйте позже.',
      }]);
    }

    setLoading(false);
  };

  const handleClearChat = async () => {
    if (sessionId) {
      try {
        await axios.post(`${API_URL}/chat/clear?session_id=${sessionId}`);
      } catch (e) {}
    }
    setMessages([]);
    setSessionId(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const currentProv = providers.find(p => p.id === currentProvider);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            Чат с ассистентом
            {messages.length > 0 && (
              <Chip label={`${messages.length} сообщ.`} size="small" variant="outlined" />
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {sessionId && (
              <Chip label={`ID: ${sessionId.slice(0, 8)}`} size="small" variant="outlined" />
            )}
            <IconButton onClick={refreshModels} size="small" title="Обновить модели" disabled={modelsLoading}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={handleClearChat} size="small" title="Очистить чат">
              <ClearIcon />
            </IconButton>
          </Box>
        </Box>
        <Divider />
      </CardContent>

      {/* Селекторы провайдера и модели */}
      <CardContent sx={{ py: 1, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={currentProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              disabled={modelsLoading}
            >
              {providers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {p.id === 'routerai' ? <CloudIcon fontSize="small" /> : 
                    p.id === 'llamacpp' ? <ServerIcon fontSize="small" /> :
                    <ComputerIcon fontSize="small" />}
                    {p.name}
                    {!p.available && ' (нет моделей)'}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 250, flex: 1 }}>
            <Select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={modelsLoading || !currentProv?.models.length}
              displayEmpty
            >
              {!currentProv?.models.length ? (
                <MenuItem value="" disabled>
                  {modelsLoading ? 'Загрузка моделей...' : 'Нет доступных моделей'}
                </MenuItem>
              ) : (
                currentProv.models.map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>
      </CardContent>

      {/* Сообщения */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, maxHeight: '55vh', bgcolor: 'grey.50' }}>
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <QuestionIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
            
            {currentProv?.models.length === 0 ? (
              <>
                <Typography variant="body1" gutterBottom color="warning.main">
                  ⚠️ Нет доступных моделей
                </Typography>
                <Typography variant="body2">
                  Все провайдеры отключены. Откройте админ-панель и включите хотя бы одного провайдера.
                </Typography>
              </>
            ) : !selectedModel ? (
              <>
                <Typography variant="body1" gutterBottom>
                  Выберите модель для начала работы
                </Typography>
                <Typography variant="body2">
                  Выберите провайдера и модель из списка выше
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body1" gutterBottom>
                  Задайте вопрос по документации Parts.Intellect
                </Typography>
                <Typography variant="body2">
                  Ассистент сам найдет нужную информацию
                </Typography>
              </>
            )}
          </Box>
        )}

        {messages.map((msg, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: 1
            }}>
              {msg.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                  <AIIcon sx={{ fontSize: 20 }} />
                </Avatar>
              )}
              
              <Paper sx={{ 
                p: 2, 
                maxWidth: '85%',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'white',
                color: msg.role === 'user' ? 'white' : 'text.primary',
                borderRadius: 2,
              }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {msg.content}
                </Typography>
                
                {msg.role === 'assistant' && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <IconButton size="small" onClick={() => copyToClipboard(msg.content)} title="Копировать">
                      <CopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                )}
              </Paper>

              {msg.role === 'user' && (
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <PersonIcon sx={{ fontSize: 20 }} />
                </Avatar>
              )}
            </Box>

            {/* Источники */}
            {msg.sources?.map((source, idx) => {
              if (source.type === 'ticket') {
                // Заявка ТП
                return (
                  <Tooltip 
                    key={idx}
                    title={`Заявка ТП | ${source.author || 'Неизвестный автор'} | ${source.date || ''}`}
                  >
                    <Chip
                      icon={<QuestionIcon />}
                      label={`[Заявка ${source.index}] ${source.title?.slice(0, 40)}...`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ maxWidth: 300 }}
                    />
                  </Tooltip>
                );
              } else {
                // Документация
                return (
                  <Tooltip 
                    key={idx}
                    title={`Документация | Релевантность: ${(source.score * 100).toFixed(1)}%`}
                  >
                    <Chip
                      icon={<LinkIcon />}
                      label={`[Док ${source.index}] ${source.title?.slice(0, 40)}...`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      component="a"
                      href={source.url}
                      target="_blank"
                      clickable
                      sx={{ maxWidth: 300 }}
                    />
                  </Tooltip>
                );
              }
            })}

            {/* Уточняющие вопросы */}
            {msg.hasQuestions && msg.suggestions && msg.suggestions.length > 0 && (
              <Box sx={{ ml: 5, mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <QuestionIcon sx={{ fontSize: 14 }} />
                  Уточняющие вопросы:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {msg.suggestions.map((suggestion, idx) => (
                    <Chip
                      key={idx}
                      label={suggestion}
                      size="small"
                      color="warning"
                      variant="outlined"
                      onClick={() => setInput(suggestion)}
                      sx={{ cursor: 'pointer', maxWidth: 400 }}
                      icon={<QuestionIcon />}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 5, mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              {currentProv?.name || 'LLM'} думает...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Поле ввода */}
      <CardContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder={selectedModel ? "Задайте вопрос..." : "Сначала выберите модель"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading || !selectedModel}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !input.trim() || !selectedModel}
            sx={{ minWidth: 50 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};