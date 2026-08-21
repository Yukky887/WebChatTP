import React from 'react';
import { Box, Button } from '@mui/material';

interface ProgramButtonsProps {
  onSelect: (program: string) => void;
}

export const ProgramButtons: React.FC<ProgramButtonsProps> = ({ onSelect }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, ml: 5, mt: 1, mb: 2 }}>
      <Button
        variant="contained"
        color="primary"
        size="small"
        onClick={() => onSelect('intellect')}
      >
        🧠 Parts.Intellect
      </Button>
      <Button
        variant="contained"
        color="secondary"
        size="small"
        onClick={() => onSelect('resource')}
      >
        🔧 Parts.Resource
      </Button>
    </Box>
  );
};