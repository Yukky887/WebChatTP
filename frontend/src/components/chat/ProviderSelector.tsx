import React from 'react';
import { Box, FormControl, Select, MenuItem, Chip } from '@mui/material';
import { Provider } from '../../types';
import { PROVIDER_ICONS } from '../../utils/constants';

interface ProviderSelectorProps {
  providers: Provider[];
  currentProvider: string;
  selectedModel: string;
  loading: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers,
  currentProvider,
  selectedModel,
  loading,
  onProviderChange,
  onModelChange,
}) => {
  const currentProv = providers.find(p => p.id === currentProvider);
  const icon = PROVIDER_ICONS[currentProvider as keyof typeof PROVIDER_ICONS] || '🤖';

  return (
    <Box className="provider-selector">
      {/* Провайдер */}
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <Select
          value={currentProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          disabled={loading || !providers.length}
          displayEmpty
        >
          {!providers.length ? (
            <MenuItem value="" disabled>
              {loading ? 'Загрузка...' : 'Нет провайдеров'}
            </MenuItem>
          ) : (
            providers.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{PROVIDER_ICONS[p.id as keyof typeof PROVIDER_ICONS] || '🤖'}</span>
                  {p.name}
                  {!p.available && ' (нет моделей)'}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {/* Модель */}
      <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
        <Select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={loading || !currentProv?.models?.length}
          displayEmpty
        >
          {!currentProv?.models?.length ? (
            <MenuItem value="" disabled>
              {loading ? 'Загрузка моделей...' : 'Нет доступных моделей'}
            </MenuItem>
          ) : (
            currentProv.models.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>
    </Box>
  );
};