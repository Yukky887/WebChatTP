import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, Tabs, Tab } from '@mui/material';
import { Lock as LockIcon, Person as PersonIcon } from '@mui/icons-material';
import axios from 'axios';
import config from './config';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);  // 0 — логин, 1 — регистрация
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = tab === 0 ? '/auth/login' : '/auth/register';
      const payload: any = { username, password };
      if (tab === 1 && email.trim()) {
      payload.email = email.trim();  // ← добавляем только если не пусто
      }

      
      const response = await axios.post(`${config.apiBaseUrl}${endpoint}`, payload);
      
      localStorage.setItem('user_token', response.data.access_token);
      localStorage.setItem('user_info', JSON.stringify(response.data.user));
      
      // Редирект
      navigate('/');
      window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f7f7f8',
    }}>
      <Card sx={{ maxWidth: 420, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <PersonIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5">
              {tab === 0 ? 'Вход' : 'Регистрация'}
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} centered>
            <Tab label="Вход" />
            <Tab label="Регистрация" />
          </Tabs>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            fullWidth
            label="Логин"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
          />

          {tab === 1 && (
            <TextField
              fullWidth
              label="Email (опционально)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            type="password"
            label="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            sx={{ mb: 3 }}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading || !username || !password}
          >
            {tab === 0 ? 'Войти' : 'Зарегистрироваться'}
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/')}
            sx={{ mt: 2 }}
          >
            ← Продолжить как гость
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;