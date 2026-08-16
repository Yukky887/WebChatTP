import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { SearchResult } from '../../types';
import { ResultCard } from './ResultCard';

interface SearchResultsProps {
  results: SearchResult[];
  total: number;
  ticketsCount: number;
  docsCount: number;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  total,
  ticketsCount,
  docsCount,
}) => {
  if (!results.length) return null;

  return (
    <Box>
      {/* Header */}
      <Box className="results-header">
        <Typography variant="h6">
          Результаты ({total})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" color="warning" label={`📋 Заявки: ${ticketsCount}`} />
          <Chip size="small" color="primary" label={`📚 Документация: ${docsCount}`} />
        </Box>
      </Box>

      {/* Grid */}
      <Box className="results-grid">
        {results.map((result, idx) => (
          <ResultCard key={idx} result={result} index={idx} />
        ))}
      </Box>
    </Box>
  );
};