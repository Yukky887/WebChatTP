import React from 'react';
import { Card, CardContent, Typography, Chip, Box, Tooltip, Link } from '@mui/material';
import { Speed as SpeedIcon } from '@mui/icons-material';
import { SearchResult } from '../../types';
import { formatScore, truncateText, formatDate } from '../../utils/formatters';

interface ResultCardProps {
  result: SearchResult;
  index: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, index }) => {
  const isTicket = result.type === 'ticket';
  
  const cardClass = isTicket
    ? 'result-card result-card-ticket'
    : 'result-card result-card-documentation';

  const title = isTicket
    ? result.header || 'Заявка ТП'
    : result.title || 'Документация';

  const content = isTicket
    ? result.answer || result.question || ''
    : result.content || '';

  return (
    <Box sx={{ flex: '1 1 400px', maxWidth: '100%' }}>
      <Card className={cardClass}>
        <CardContent>
          {/* Header */}
          <Box className="result-header">
            <Chip
              size="small"
              label={isTicket ? '📋 Заявка ТП' : '📚 Документация'}
              color={isTicket ? 'warning' : 'primary'}
            />
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                size="small"
                variant="outlined"
                label={`Score: ${formatScore(result.score)}`}
                color="success"
              />
            </Box>
          </Box>

          {/* Title */}
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>

          {/* Для заявок — вопрос и автор */}
          {isTicket && result.question && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Вопрос:</strong> {truncateText(result.question, 200)}
            </Typography>
          )}

          {isTicket && result.author && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              👤 {result.author}
              {result.source_date && ` | 📅 ${formatDate(result.source_date)}`}
            </Typography>
          )}

          {/* Content */}
          <Typography
            variant="body2"
            color="text.secondary"
            className="result-content"
          >
            {truncateText(content, 500)}
          </Typography>

          {/* Link */}
          {!isTicket && result.url && (
            <Box sx={{ mt: 1 }}>
              <Link href={result.url} target="_blank" variant="caption">
                Открыть источник
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};