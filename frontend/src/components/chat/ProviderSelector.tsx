import React from 'react';
import { Box, FormControl, Select, MenuItem } from '@mui/material';
import { Provider } from '../../types';

interface ProviderSelectorProps {
  providers: Provider[];
  currentProvider: string;
  selectedModel: string;
  loading: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  providers, currentProvider, selectedModel, loading,
  onProviderChange, onModelChange,
}) => {
  return (
    <Box sx={{ 
      display: 'flex', gap: 0.5, 
      alignItems: 'center',
      bgcolor: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(8px)',
      borderRadius: 2,
      px: 1,
      py: 0.5,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <FormControl size="small" variant="standard" sx={{ minWidth: 140, px: 1 }}>
        <Select
          value={currentProvider}
          onChange={(e) => onProviderChange(e.target.value)}
          disabled={loading || !providers.length}
          disableUnderline
          sx={{ fontSize: '0.85rem' }}
        >
          {providers.map((p) => (
            <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.85rem' }}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" variant="standard" sx={{ minWidth: 200, px: 1, flex: 1 }}>
        <Select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={loading}
          disableUnderline
          sx={{ fontSize: '0.85rem' }}
          displayEmpty
        >
          {!selectedModel ? (
            <MenuItem value="" disabled sx={{ fontSize: '0.85rem' }}>
              {loading ? 'Загрузка...' : 'Выберите модель'}
            </MenuItem>
          ) : (
            <MenuItem value={selectedModel} sx={{ fontSize: '0.85rem' }}>
              {selectedModel}
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
};