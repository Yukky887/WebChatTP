import React from 'react';
import {
  Box, Card, CardContent, Typography, Switch, Alert,
  Divider,
} from '@mui/material';
import { API_SCOPE_LABELS } from '../../types';

/** Порядок и подписи BitInfo_* коллекций (дампы Bitrix24) */
const BITRIX_SCOPES = [
  'bitrix_wiki', 'bitrix_doc', 'bitrix_kb', 'bitrix_lst',
  'bitrix_markup', 'bitrix_ol', 'bitrix_olc', 'bitrix_saleskb', 'bitrix_salesdeal',
] as const;

const BITRIX_HINTS: Record<string, string> = {
  bitrix_wiki: 'Wiki Битрикс24',
  bitrix_doc: 'Документация Битрикс24',
  bitrix_kb: 'База знаний CRM',
  bitrix_lst: 'Списки CRM',
  bitrix_markup: 'Разметка сделок',
  bitrix_ol: 'Открытые линии — переписки',
  bitrix_olc: 'Открытые линии — чаты',
  bitrix_saleskb: 'База знаний продаж',
  bitrix_salesdeal: 'Сделки CRM',
};

interface SearchSettingsPanelProps {
  useTickets: boolean;
  useDocumentation: boolean;
  bitrixScopes: Record<string, boolean>;
  loading: boolean;
  onToggleTickets: (enabled: boolean) => void;
  onToggleDocumentation: (enabled: boolean) => void;
  onToggleBitrix: (scope: string, enabled: boolean) => void;
}

export const SearchSettingsPanel: React.FC<SearchSettingsPanelProps> = ({
  useTickets,
  useDocumentation,
  bitrixScopes,
  loading,
  onToggleTickets,
  onToggleDocumentation,
  onToggleBitrix,
}) => {
  const anyBitrix = Object.values(bitrixScopes).some(Boolean);

  return (
    <Card className="admin-card">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Источники контекста
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Выберите какие источники использовать при формировании контекста для LLM
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#fafafa' }}>
          <Box>
            <Typography variant="subtitle1">📋 Заявки ТП</Typography>
            <Typography variant="caption" color="text.secondary">
              Реальные решения из техподдержки (TsSpKb)
            </Typography>
          </Box>
          <Switch
            checked={useTickets}
            onChange={(e) => onToggleTickets(e.target.checked)}
            disabled={loading}
            color="warning"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, p: 1.5, borderRadius: 2, bgcolor: '#fafafa' }}>
          <Box>
            <Typography variant="subtitle1">📚 Документация</Typography>
            <Typography variant="caption" color="text.secondary">
              Parts.Intellect и Parts.Resource документация
            </Typography>
          </Box>
          <Switch
            checked={useDocumentation}
            onChange={(e) => onToggleDocumentation(e.target.checked)}
            disabled={loading}
            color="primary"
          />
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* BitInfo_* (Bitrix24): по умолчанию выключены — при включении
            становятся видны и веб-клиенту с гостем (API-токенам не подчиняются,
            у них свои скоупы токена) */}
        <Typography variant="subtitle2" gutterBottom>
          🗂 Bitrix24 (выгрузки BitrixInfo)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          По умолчанию выключены: веб-клиент и гость их не ищут (только API-токены).
          Включённые коллекции попадают в контекст веб-чата сверху по релевантности (до 8 чанков).
        </Typography>

        <Box sx={{ pl: 0.5 }}>
          {BITRIX_SCOPES.map((s) => (
            <Box
              key={s}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, p: 1, borderRadius: 1.5, bgcolor: bitrixScopes[s] ? '#fff8e1' : '#fafafa' }}
            >
              <Box sx={{ mr: 1 }}>
                <Typography variant="body2">
                  {API_SCOPE_LABELS[s] || s}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {BITRIX_HINTS[s]} ({s})
                </Typography>
              </Box>
              <Switch
                checked={!!bitrixScopes[s]}
                onChange={(e) => onToggleBitrix(s, e.target.checked)}
                disabled={loading}
                color="secondary"
                size="small"
              />
            </Box>
          ))}
        </Box>

        {!useTickets && !useDocumentation && !anyBitrix && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Все источники отключены! LLM не получит контекст.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
