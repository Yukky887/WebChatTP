import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button,
} from '@mui/material';
import {
  Star as StarIcon,
  Block as BlockIcon,
} from '@mui/icons-material';
import { ProviderModels } from '../../types';

interface ModelsPanelProps {
  providersModels: Record<string, ProviderModels>;
  allowedModels: string[];
  favoriteModels: string[];
  loading: boolean;
  onUpdateModels: (allowed: string[], favorites: string[]) => void;
}

export const ModelsPanel: React.FC<ModelsPanelProps> = ({
  providersModels,
  allowedModels,
  favoriteModels,
  loading,
  onUpdateModels,
}) => {
  const [localAllowed, setLocalAllowed] = React.useState<string[]>(allowedModels);
  const [localFavorites, setLocalFavorites] = React.useState<string[]>(favoriteModels);

  React.useEffect(() => {
    setLocalAllowed(allowedModels);
    setLocalFavorites(favoriteModels);
  }, [allowedModels, favoriteModels]);

  const toggleAllowed = (model: string) => {
    const updated = localAllowed.includes(model)
      ? localAllowed.filter(m => m !== model)
      : [...localAllowed, model];
    setLocalAllowed(updated);
    onUpdateModels(updated, localFavorites);
  };

  const toggleFavorite = (model: string) => {
    const updated = localFavorites.includes(model)
      ? localFavorites.filter(m => m !== model)
      : [...localFavorites, model];
    setLocalFavorites(updated);
    onUpdateModels(localAllowed, updated);
  };

  const allowAllProvider = (providerModels: string[]) => {
    const merged = [...localAllowed, ...providerModels];
    const unique = merged.filter((item, index) => merged.indexOf(item) === index);
    setLocalAllowed(unique);
    onUpdateModels(unique, localFavorites);
  };

  const blockAllProvider = (providerModels: string[]) => {
    const updated = localAllowed.filter(m => !providerModels.includes(m));
    setLocalAllowed(updated);
    onUpdateModels(updated, localFavorites);
  };

  return (
    <Card className="admin-card">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Управление моделями
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          ⭐ — избранное | ✅ — разрешено | ⬜ — запрещено
        </Typography>

        {Object.entries(providersModels).map(([pid, data]) => (
          <Box key={pid} className="models-container">
            {/* Header провайдера */}
            <Box className="model-group-header">
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {data.name}
              </Typography>
              <Chip label={data.all_models.length} size="small" />
              <Button
                size="small"
                variant="outlined"
                onClick={() => allowAllProvider(data.all_models)}
                disabled={loading}
              >
                + Все
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => blockAllProvider(data.all_models)}
                disabled={loading}
              >
                − Все
              </Button>
            </Box>

            {/* Группы моделей */}
            {Object.entries(data.grouped).map(([family, models]) => (
              <Box key={family} className="model-group">
                <Box className="model-group-header">
                  <Typography variant="subtitle2">{family}</Typography>
                  <Chip label={models.length} size="small" />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {models.map((model) => {
                    const isAllowed = localAllowed.includes(model);
                    const isFavorite = localFavorites.includes(model);
                    
                    return (
                      <Chip
                        key={model}
                        label={model}
                        size="small"
                        color={!isAllowed ? 'default' : isFavorite ? 'warning' : 'success'}
                        variant={isAllowed ? 'filled' : 'outlined'}
                        icon={isFavorite ? <StarIcon /> : undefined}
                        onDelete={isAllowed ? () => toggleAllowed(model) : undefined}
                        deleteIcon={<BlockIcon />}
                        onClick={() => toggleFavorite(model)}
                        className={`model-chip ${isAllowed ? 'model-chip-allowed' : 'model-chip-blocked'}`}
                        sx={{ maxWidth: 400 }}
                      />
                    );
                  })}
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};