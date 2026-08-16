import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, IconButton,
} from '@mui/material';
import {
  Lock as LockIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAdmin } from './hooks/useAdmin';
import { LLMSettingsPanel } from './components/admin/LLMSettingsPanel';
import { ProvidersPanel } from './components/admin/ProvidersPanel';
import { ModelsPanel } from './components/admin/ModelsPanel';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authenticated, loading, error, settings,
    login, logout, loadSettings, saveSettings, resetSettings,
    updateModels, toggleProvider, setApiKey,
  } = useAdmin();

  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);

  // Загружаем настройки при авторизации
  React.useEffect(() => {
    if (authenticated && !settings) {
      loadSettings();
    }
  }, [authenticated, settings, loadSettings]);

  const handleLogin = async () => {
    const success = await login(password);
    if (success) {
      setPassword('');
    }
  };

  const handleSaveSettings = async (newSettings: any) => {
    const success = await saveSettings(newSettings);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  // Экран входа
  if (!authenticated) {
    return (
      <Box className="login-container">
        <Card className="login-card">
          <CardContent>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <LockIcon className="login-icon" />
              <Typography variant="h5" gutterBottom>
                Админ-панель
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Введите пароль для доступа
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TextField
              fullWidth
              type="password"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              sx={{ mb: 2 }}
              autoFocus
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              disabled={loading || !password}
            >
              Войти
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => navigate('/')}
              sx={{ mt: 1 }}
            >
              ← На главную
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Основной интерфейс
  return (
    <Box className="admin-container">
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
        {/* Header */}
        <Box className="admin-header">
          <Box className="admin-title">
            <IconButton onClick={() => navigate('/')} size="small">
              <ArrowBackIcon />
            </IconButton>
            ⚙️ Админ-панель
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/')}>
              На главную
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={logout}
            >
              Выйти
            </Button>
          </Box>
        </Box>

        {settings ? (
          <Box>
            <LLMSettingsPanel
              settings={settings.settings}
              loading={loading}
              saved={saved}
              onSave={handleSaveSettings}
              onReset={resetSettings}
            />

            <ProvidersPanel
              providers={settings.providers}
              loading={loading}
              onToggle={toggleProvider}
              onSetApiKey={setApiKey}
            />

            <ModelsPanel
              providersModels={settings.providers_models}
              allowedModels={settings.allowed_models}
              favoriteModels={settings.favorite_models}
              loading={loading}
              onUpdateModels={updateModels}
            />
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {loading ? 'Загрузка настроек...' : 'Не удалось загрузить настройки'}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AdminPage;