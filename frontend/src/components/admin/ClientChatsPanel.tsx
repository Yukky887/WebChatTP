import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Chip, Typography, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Alert, CircularProgress,
  Tooltip, IconButton,
} from '@mui/material';
import {
  Send as SendIcon, Refresh as RefreshIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { adminApi } from '../../api/admin';
import {
  ClientChatSession, ClientChatMessage, ChatSessionStatus,
} from '../../types';

const STATUS_LABEL: Record<ChatSessionStatus, string> = {
  active: '🤖 Бот',
  waiting_operator: '🔴 Ждёт спеца',
  operator_active: '🧑‍💼 Оператор ведёт',
  closed: '✔ Закрыт',
};

const STATUS_COLOR: Record<ChatSessionStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'default',
  waiting_operator: 'error',
  operator_active: 'warning',
  closed: 'success',
};

const fmtTime = (iso: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
};

/** Одна сессия в списке */
const SessionRow: React.FC<{
  s: ClientChatSession;
  selected: boolean;
  onClick: () => void;
}> = ({ s, selected, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      px: 1.5, py: 1, mb: 0.5, borderRadius: 1.5, cursor: 'pointer',
      bgcolor: selected ? '#eceefc' : 'transparent',
      border: '1px solid', borderColor: selected ? 'primary.main' : 'divider',
      '&:hover': { bgcolor: 'action.hover' },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
        {s.client || '(без токена — веб/гость)'}
      </Typography>
      <Chip size="small" label={STATUS_LABEL[s.status]} color={STATUS_COLOR[s.status]} />
    </Box>
    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
      {s.title || 'Без названия'}
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
      <Typography variant="caption" color="text.secondary">
        {fmtTime(s.updated_at)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        · {s.message_count} сообщ.
      </Typography>
      {s.escalated_at && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          · эскалация {fmtTime(s.escalated_at)}
        </Typography>
      )}
    </Box>
  </Box>
);

/** Сообщение транскрипта */
const TranscriptMsg: React.FC<{ m: ClientChatMessage }> = ({ m }) => {
  const isUser = m.role === 'user';
  const isOperator = m.role === 'operator';
  const bg = isUser ? '#4f5bd5' : isOperator ? '#e8f5e9' : '#f5f5f7';
  const fg = isUser ? '#fff' : '#2b2b33';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', mb: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
        {isUser ? 'Клиент' : isOperator ? 'Оператор' : 'Ассистент (бот)'} · {fmtTime(m.created_at)}
      </Typography>
      <Box
        sx={{
          maxWidth: '88%', px: 1.25, py: 0.75, borderRadius: 1.5,
          bgcolor: bg, color: fg, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontSize: 13, lineHeight: 1.45,
        }}
      >
        {m.content}
        {m.sources?.length > 0 && (
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.75 }}>
            📎 {m.sources.map((s) => s.title || s.type).filter(Boolean).slice(0, 5).join(', ')}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export const ClientChatsPanel: React.FC = () => {
  const [sessions, setSessions] = useState<ClientChatSession[]>([]);
  const [waiting, setWaiting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Фильтры
  const [statusFilter, setStatusFilter] = useState<string>('escalations');
  const [tokenFilter, setTokenFilter] = useState<string>('');
  const [tokens, setTokens] = useState<{ id: number; name: string }[]>([]);

  // Выбранная сессия
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientChatMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (tokenFilter) params.token_id = Number(tokenFilter);
      const data = await adminApi.getClientChats(params);
      setSessions(data.sessions);
      setWaiting(data.waiting);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить чаты');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, tokenFilter]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await adminApi.getClientChat(id);
      setDetail(data.messages);
      setSessions((prev) => prev.map(
        (s) => (s.id === id ? { ...s, ...data.session } : s),
      ));
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить переписку');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Токены-клиенты для фильтра (однократно)
  useEffect(() => {
    adminApi.listApiTokens()
      .then((d) => setTokens(d.tokens.map((t) => ({ id: t.id, name: t.name }))))
      .catch(() => {});
  }, []);

  // Автообновление списка ~10 c
  useEffect(() => {
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  // Автообновление открытой переписки ~7 c (пока диалог живой)
  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => loadDetail(selectedId), 7000);
    return () => clearInterval(t);
  }, [selectedId, loadDetail]);

  // Скролл транскрипта вниз при новых сообщениях
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [detail, selectedId]);

  const selected = useMemo(
    () => sessions.find((s) => s.id === selectedId) || null,
    [sessions, selectedId],
  );

  const handleSelect = (id: string) => {
    setSelectedId(id);
    loadDetail(id);
  };

  const handleAction = async (action: 'take' | 'release' | 'resume' | 'close') => {
    if (!selectedId) return;
    try {
      await adminApi.chatOperatorAction(selectedId, action);
      await load();
      await loadDetail(selectedId);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось изменить статус');
    }
  };

  const handleSend = async () => {
    const text = reply.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      await adminApi.sendOperatorMessage(selectedId, text);
      setReply('');
      await load();
      await loadDetail(selectedId);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось отправить сообщение');
    } finally {
      setSending(false);
    }
  };

  const st = selected?.status;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Typography variant="h6">💬 Чаты клиентов</Typography>
          {waiting > 0 && (
            <Chip size="small" color="error" label={`🔴 ждут спеца: ${waiting}`} />
          )}
          <Tooltip title="Обновить сейчас">
            <IconButton size="small" onClick={() => load()}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          {/* ── Левая колонка: список сессий ── */}
          <Box sx={{ width: 330, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <FormControl size="small" sx={{ width: '55%' }}>
                <InputLabel>Статус</InputLabel>
                <Select
                  value={statusFilter}
                  label="Статус"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="escalations">🔴 Эскалации</MenuItem>
                  <MenuItem value="active">🤖 Активные (бот)</MenuItem>
                  <MenuItem value="waiting_operator">🔴 Ждут спеца</MenuItem>
                  <MenuItem value="operator_active">🧑‍💼 С оператором</MenuItem>
                  <MenuItem value="closed">✔ Закрытые</MenuItem>
                  <MenuItem value="all">Все</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Клиент</InputLabel>
                <Select
                  value={tokenFilter}
                  label="Клиент"
                  onChange={(e) => setTokenFilter(e.target.value)}
                >
                  <MenuItem value="">Все</MenuItem>
                  {tokens.map((t) => (
                    <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ maxHeight: '62vh', overflowY: 'auto', pr: 0.5 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : sessions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Сессий нет
                </Typography>
              ) : (
                sessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    s={s}
                    selected={s.id === selectedId}
                    onClick={() => handleSelect(s.id)}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* ── Правая колонка: транскрипт + ответ ── */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
                Выберите сессию слева, чтобы посмотреть переписку
                и при необходимости ответить клиенту как оператор.
              </Typography>
            ) : (
              <>
                {/* Шапка сессии */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                  <Chip size="small" label={STATUS_LABEL[selected.status]} color={STATUS_COLOR[selected.status]} />
                  <Typography variant="subtitle2" noWrap>
                    {selected.client || '(без токена — веб/гость)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {selected.title}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  {st !== 'closed' && (
                    <Tooltip title="Закрыть сессию">
                      <IconButton size="small" onClick={() => handleAction('close')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Кнопки статусов */}
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  {st === 'waiting_operator' && (
                    <Button size="small" variant="contained" color="error"
                      onClick={() => handleAction('take')}>
                      Взять в работу
                    </Button>
                  )}
                  {st === 'operator_active' && (
                    <Button size="small" variant="outlined"
                      onClick={() => handleAction('release')}>
                      Освободить
                    </Button>
                  )}
                  {(st === 'waiting_operator' || st === 'operator_active') && (
                    <Button size="small" variant="outlined"
                      onClick={() => handleAction('resume')}>
                      Вернуть боту
                    </Button>
                  )}
                  {st === 'closed' && (
                    <Button size="small" variant="outlined"
                      onClick={() => handleAction('resume')}>
                      Открыть заново
                    </Button>
                  )}
                </Box>

                {/* Транскрипт */}
                <Box
                  ref={transcriptRef}
                  sx={{
                    maxHeight: '48vh', overflowY: 'auto', p: 1.5,
                    border: '1px solid', borderColor: 'divider', borderRadius: 2,
                    bgcolor: '#fafafc',
                  }}
                >
                  {detailLoading && detail.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <CircularProgress size={22} />
                    </Box>
                  ) : detail.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                      Сообщений пока нет
                    </Typography>
                  ) : (
                    detail.map((m) => <TranscriptMsg key={m.id} m={m} />)
                  )}
                </Box>

                {/* Ответ оператора */}
                {st !== 'closed' && (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'flex-end' }}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={1}
                      maxRows={5}
                      placeholder="Ответ оператора клиенту (бот получит паузу)… (Ctrl+Enter — отправить)"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button
                      variant="contained"
                      disabled={sending || !reply.trim()}
                      startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
                      onClick={handleSend}
                    >
                      Отправить
                    </Button>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
