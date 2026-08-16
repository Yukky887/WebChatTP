import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Button, Card, CardContent,
  Chip, LinearProgress, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Psychology as AIIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { useHealth } from './hooks/useHealth';
import { useSearch } from './hooks/useSearch';
import { ChatComponent } from './components/chat/ChatComponent';
import { SearchBar } from './components/search/SearchBar';
import { SearchResults } from './components/search/SearchResults';
import type { PageMode } from './types';

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<PageMode>('chat');
  
  const { health, loading: healthLoading } = useHealth();
  const {
    results, loading: searchLoading, error: searchError,
    total, ticketsCount, docsCount, search, clear,
  } = useSearch();

  const healthChecks = health
    ? [
        { label: 'Weaviate', status: health.weaviate },
        { label: 'Qdrant', status: health.qdrant },
        { label: 'Модель', status: health.model },
      ]
    : [];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Parts Knowledge Base
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Документация + Заявки ТП + LLM
          </Typography>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/admin')}
            size="small"
          >
            Админка
          </Button>
        </Box>
      </Box>

      {/* Health */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ mr: 1 }}>
              Статус:
            </Typography>
            {healthChecks.map((check) => (
              <Chip
                key={check.label}
                icon={<StorageIcon />}
                label={`${check.label}: ${check.status ? 'OK' : '—'}`}
                color={check.status ? 'success' : 'default'}
                variant="outlined"
                size="small"
              />
            ))}
            {health?.warning && (
              <Chip
                label={health.warning}
                color="warning"
                size="small"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Переключатель */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant={mode === 'chat' ? 'contained' : 'outlined'}
          startIcon={<AIIcon />}
          onClick={() => setMode('chat')}
        >
          Чат с ассистентом
        </Button>
        <Button
          variant={mode === 'search' ? 'contained' : 'outlined'}
          startIcon={<SearchIcon />}
          onClick={() => setMode('search')}
        >
          Поиск по базам
        </Button>
      </Box>

      {/* Контент */}
      {mode === 'chat' ? (
        <ChatComponent />
      ) : (
        <Box>
          <SearchBar loading={searchLoading} onSearch={search} />
          
          {searchLoading && <LinearProgress sx={{ mb: 2 }} />}
          
          <SearchResults
            results={results}
            total={total}
            ticketsCount={ticketsCount}
            docsCount={docsCount}
          />

          {!searchLoading && !results.length && (
            <Box className="empty-state">
              <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Введите запрос для поиска
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Поиск выполняется по заявкам ТП и документации
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default MainPage;