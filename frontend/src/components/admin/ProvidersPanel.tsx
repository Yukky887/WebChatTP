import React from 'react';
import {
  Box, Card, CardContent, Typography, Switch, Chip,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Button,
} from '@mui/material';
import { Key as KeyIcon } from '@mui/icons-material';
import { ProviderConfig } from '../../types';

interface ProvidersPanelProps {
  providers: Record<string, ProviderConfig>;
  loading: boolean;
  onToggle: (provider: string, enabled: boolean) => void;
  onSetApiKey: (provider: string, apiKey: string) => void;
}

export const ProvidersPanel: React.FC<ProvidersPanelProps> = ({
  providers,
  loading,
  onToggle,
  onSetApiKey,
}) => {
  const [apiKeyDialog, setApiKeyDialog] = React.useState(false);
  const [apiKeyProvider, setApiKeyProvider] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');

  const handleOpenApiKey = (provider: string) => {
    setApiKeyProvider(provider);
    setApiKey('');
    setApiKeyDialog(true);
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      onSetApiKey(apiKeyProvider, apiKey.trim());
    }
    setApiKeyDialog(false);
  };

  return (
    <Card className="admin-card">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Провайдеры
        </Typography>

        {Object.entries(providers).map(([pid, config]) => (
          <Box
            key={pid}
            className={`provider-card ${config.enabled ? 'provider-card-enabled' : 'provider-card-disabled'}`}
          >
            <Box className="provider-info">
              <Typography variant="subtitle1">
                {config.name}
                {!config.enabled && (
                  <Chip
                    label="Отключен"
                    size="small"
                    color="error"
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Моделей: {config.models?.length || 0}
                {config.api_key_set && ' | Ключ установлен'}
                {' | '}{config.base_url}
              </Typography>
            </Box>
            <Box className="provider-actions">
              <Tooltip title="API ключ">
                <IconButton onClick={() => handleOpenApiKey(pid)} size="small">
                  <KeyIcon />
                </IconButton>
              </Tooltip>
              <Switch
                checked={config.enabled}
                onChange={(e) => onToggle(pid, e.target.checked)}
                disabled={loading}
              />
            </Box>
          </Box>
        ))}

        {/* Диалог API ключа */}
        <Dialog open={apiKeyDialog} onClose={() => setApiKeyDialog(false)}>
          <DialogTitle>
            API ключ для {apiKeyProvider}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              sx={{ mt: 1, minWidth: 300 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApiKeyDialog(false)}>Отмена</Button>
            <Button onClick={handleSaveApiKey} variant="contained">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};