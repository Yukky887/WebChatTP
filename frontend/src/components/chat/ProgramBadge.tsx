import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface ProgramBadgeProps {
  program: string | null;
  onReset: () => void;
}

export const ProgramBadge: React.FC<ProgramBadgeProps> = ({ program, onReset }) => {
  if (!program) return null;

  return (
    <Box sx={{ 
      px: 2, py: 1, bgcolor: '#f0f7ff', 
      borderBottom: '1px solid #e0e0e0',
      display: 'flex', alignItems: 'center', gap: 1 
    }}>
      <Typography variant="body2">
        Программа: <strong>{program === 'intellect' ? '🧠 Parts.Intellect' : '🔧 Parts.Resource'}</strong>
      </Typography>
      <Chip
        label="Сбросить"
        size="small"
        variant="outlined"
        onClick={onReset}
        sx={{ cursor: 'pointer', ml: 1 }}
      />
    </Box>
  );
};