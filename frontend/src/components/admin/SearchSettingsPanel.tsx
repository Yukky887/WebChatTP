import React from 'react';
import {
  Box, Card, CardContent, Typography, Switch, Alert,
} from '@mui/material';

interface SearchSettingsPanelProps {
  useTickets: boolean;
  useDocumentation: boolean;
  loading: boolean;
  onToggleTickets: (enabled: boolean) => void;
  onToggleDocumentation: (enabled: boolean) => void;
}

export const SearchSettingsPanel: React.FC<SearchSettingsPanelProps> = ({
  useTickets,
  useDocumentation,
  loading,
  onToggleTickets,
  onToggleDocumentation,
}) => {
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

        {!useTickets && !useDocumentation && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            Все источники отключены! LLM не получит контекст.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};