import React, { useState, useCallback } from 'react';
import { Box, TextField, Button, Card, CardContent } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

interface SearchBarProps {
  loading: boolean;
  onSearch: (query: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ loading, onSearch }) => {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    onSearch(query.trim());
  }, [query, onSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Card className="search-container">
      <CardContent>
        <Box className="search-bar">
          <Box className="search-input">
            <TextField
              fullWidth
              label="Поисковый запрос"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Например: как настроить SEO..."
              disabled={loading}
            />
          </Box>
          <Box className="search-button">
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              disabled={loading || !query.trim()}
            >
              Искать
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};