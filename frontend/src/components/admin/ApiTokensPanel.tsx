import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Switch, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControlLabel, Checkbox, Alert, Tooltip, CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteOutlineIcon,
  Key as KeyIcon, ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin';
import { ApiToken, API_SCOPE_LABELS } from '../../types';
import { formatDate } from '../../utils/formatters';

const SCOPES_FALLBACK = ['tickets', 'parts_intellect', 'parts_resource'];

export const ApiTokensPanel: React.FC = () => {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [allowedScopes, setAllowedScopes] = useState<string[]>(SCOPES_FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Диалог генерации
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>(['tickets', 'parts_intellect', 'parts_resource']);
  const [creating, setCreating] = useState(false);

  // Диалог показа свежесозданного токена
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listApiTokens();
      setTokens(data.tokens);
      if (data.allowed_scopes?.length) {
        setAllowedScopes(data.allowed_scopes);
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить токены');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const created = await adminApi.createApiToken({ name: name.trim(), scopes: selected });
      setCreateOpen(false);
      setName('');
      setSelected(['tickets', 'parts_intellect', 'parts_resource']);
      setNewToken(created.token);
      setCopied(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось создать токен');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (t: ApiToken) => {
    try {
      await adminApi.toggleApiToken(t.id, !t.is_active);
      setTokens(prev => prev.map(x => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось изменить токен');
    }
  };

  const handleDelete = async (t: ApiToken) => {
    if (!window.confirm(`Удалить токен «${t.name}»? Клиенты с этим токеном потеряют доступ.`)) return;
    try {
      await adminApi.deleteApiToken(t.id);
      setTokens(prev => prev.filter(x => x.id !== t.id));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось удалить токен');
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(newToken || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard недоступен */ }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyIcon color="primary" />
            <Typography variant="h6">🔑 API-токены (доступ по API)</Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Сгенерировать
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Токен позволяет внешним системам работать с чатом через API
          (заголовок <code>X-API-Key</code>): выбор модели, вопрос-ответ, картинки и поиск —
          но только по выбранным коллекциям. Значение токена показывается один раз.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : tokens.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            Пока нет ни одного токена — создайте для отдела ТП (все галочки)
            или для отдела продаж (только документация).
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Название</TableCell>
                  <TableCell>Коллекции</TableCell>
                  <TableCell>Токен</TableCell>
                  <TableCell>Создан</TableCell>
                  <TableCell>Использован</TableCell>
                  <TableCell align="center">Активен</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {tokens.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(t.scopes || []).map(s => (
                          <Chip key={s} size="small" label={API_SCOPE_LABELS[s] || s} variant="outlined" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.is_active ? 'Активен' : 'Отключён'}>
                        <code style={{ fontSize: 12 }}>wcb_{t.prefix}…</code>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{t.created_at ? formatDate(t.created_at) : '—'}</TableCell>
                    <TableCell>{t.last_used_at ? formatDate(t.last_used_at) : '—'}</TableCell>
                    <TableCell align="center">
                      <Switch checked={t.is_active} onChange={() => handleToggle(t)} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleDelete(t)} aria-label="удалить">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      {/* Диалог генерации */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🔑 Новый API-токен</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label="Название (для кого токен)"
            placeholder="Например: Отдел продаж / Отдел ТП"
            value={name}
            onChange={e => setName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Доступные коллекции поиска:
          </Typography>
          {allowedScopes.map(scope => (
            <FormControlLabel
              key={scope}
              control={
                <Checkbox
                  checked={selected.includes(scope)}
                  onChange={(_, checked) =>
                    setSelected(prev => checked
                      ? [...prev, scope]
                      : prev.filter(s => s !== scope))
                  }
                />
              }
              label={API_SCOPE_LABELS[scope] || scope}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !name.trim() || selected.length === 0}
          >
            Сгенерировать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог показа значения токена (однократный) */}
      <Dialog open={!!newToken} onClose={() => setNewToken(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Токен создан 🎉</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Скопируйте значение сейчас — <b>больше оно нигде не покажется</b>
            (в базе хранится только хэш).
          </Alert>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              value={newToken || ''}
              slotProps={{ input: { readOnly: true, sx: { fontFamily: 'monospace', fontSize: 13 } } }}
            />
            <IconButton onClick={copyToken} color={copied ? 'success' : 'default'}>
              <CopyIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Передавайте его как заголовок <code>X-API-Key: &lt;значение&gt;</code>
            (или <code>Authorization: Bearer &lt;значение&gt;</code>).
          </Typography>
          {copied && <Alert severity="success" sx={{ mt: 2 }}>Скопировано!</Alert>}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setNewToken(null)}>Готово</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
