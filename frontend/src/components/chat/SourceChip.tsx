import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { QuestionAnswer as TicketIcon, Link as DocIcon, Public as WebIcon } from '@mui/icons-material';
import { Source } from '../../types';
import { truncateText, formatScore, formatDate } from '../../utils/formatters';

interface SourceChipProps {
  source: Source;
}

export const SourceChip: React.FC<SourceChipProps> = ({ source }) => {
  const isTicket = source.type === 'ticket';
  const isWeb = source.type === 'web';

  const url = source.url || undefined;

  const tooltipText = isWeb
    ? `Интернет-источник${source.score ? ` | Релевантность: ${formatScore(source.score)}` : ''}`
    : isTicket
      ? [
          'Заявка ТП',
          source.author ? `Автор: ${source.author}` : null,
          source.date ? `Дата: ${formatDate(source.date)}` : null,
          `Релевантность: ${formatScore(source.score)}`,
        ].filter(Boolean).join(' | ')
      : `Документация | Релевантность: ${formatScore(source.score)}`;

  return (
    <Tooltip title={tooltipText}>
      <Chip
        size="small"
        icon={isWeb ? <WebIcon /> : isTicket ? <TicketIcon /> : <DocIcon />}
        label={`[${source.index}] ${truncateText(source.title, 40)}`}
        variant="outlined"
        color={isWeb ? 'success' : isTicket ? 'warning' : 'primary'}
        component={url ? 'a' : 'div'}
        href={url}
        target={url ? '_blank' : undefined}
        clickable={!!url}
        className="source-chip"
        sx={{ 
          maxWidth: 300,
          cursor: url ? 'pointer' : 'default',
        }}
      />
    </Tooltip>
  );
};