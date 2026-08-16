import React from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Slider, Alert,
} from '@mui/material';
import {
  Save as SaveIcon,
  Restore as ResetIcon,
} from '@mui/icons-material';
import { LLMSettings } from '../../types';

interface LLMSettingsPanelProps {
  settings: LLMSettings;
  loading: boolean;
  saved: boolean;
  onSave: (settings: LLMSettings) => void;
  onReset: () => void;
}

export const LLMSettingsPanel: React.FC<LLMSettingsPanelProps> = ({
  settings,
  loading,
  saved,
  onSave,
  onReset,
}) => {
  const [localSettings, setLocalSettings] = React.useState<LLMSettings>(settings);

  // Обновляем локальное состояние при изменении внешних настроек
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateField = (field: keyof LLMSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="admin-card">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Параметры генерации
        </Typography>

        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Настройки сохранены!
          </Alert>
        )}

        {/* Temperature */}
        <Box className="slider-row">
          <Box className="slider-item">
            <Typography variant="body2" gutterBottom>
              Temperature: {localSettings.temperature}
            </Typography>
            <Slider
              value={localSettings.temperature}
              onChange={(_, v) => updateField('temperature', v as number)}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
              disabled={loading}
            />
          </Box>

          {/* Top P */}
          <Box className="slider-item">
            <Typography variant="body2" gutterBottom>
              Top P: {localSettings.top_p}
            </Typography>
            <Slider
              value={localSettings.top_p}
              onChange={(_, v) => updateField('top_p', v as number)}
              min={0}
              max={1}
              step={0.05}
              marks={[
                { value: 0, label: '0' },
                { value: 0.5, label: '0.5' },
                { value: 1, label: '1' },
              ]}
              disabled={loading}
            />
          </Box>
        </Box>

        {/* Числовые поля */}
        <Box className="number-fields-row">
          <Box className="number-field">
            <TextField
              fullWidth
              label="Max Tokens"
              type="number"
              size="small"
              value={localSettings.max_tokens}
              onChange={(e) => updateField('max_tokens', parseInt(e.target.value) || 8000)}
              disabled={loading}
            />
          </Box>
          <Box className="number-field">
            <TextField
              fullWidth
              label="Repeat Penalty"
              type="number"
              size="small"
              value={localSettings.repeat_penalty}
              onChange={(e) => updateField('repeat_penalty', parseFloat(e.target.value) || 1.1)}
              disabled={loading}
            />
          </Box>
          <Box className="number-field">
            <TextField
              fullWidth
              label="Context Size"
              type="number"
              size="small"
              value={localSettings.num_ctx}
              onChange={(e) => updateField('num_ctx', parseInt(e.target.value) || 8192)}
              disabled={loading}
            />
          </Box>
        </Box>

        {/* System Prompt */}
        <TextField
          fullWidth
          label="System Prompt Template"
          multiline
          rows={6}
          size="small"
          value={localSettings.system_prompt_template}
          onChange={(e) => updateField('system_prompt_template', e.target.value)}
          disabled={loading}
          sx={{ mt: 2 }}
        />

        {/* Кнопки */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => onSave(localSettings)}
            disabled={loading}
          >
            Сохранить
          </Button>
          <Button
            variant="outlined"
            startIcon={<ResetIcon />}
            onClick={onReset}
            disabled={loading}
          >
            Сбросить
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};