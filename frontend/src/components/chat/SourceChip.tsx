import React from 'react';
import { Chip, Tooltip } from '@mui/material';
import { QuestionAnswer as TicketIcon, Link as DocIcon } from '@mui/icons-material';
import { Source } from '../../types';
import { truncateText, formatScore, formatDate } from '../../utils/formatters';

interface SourceChipProps {
  source: Source;
}

export const SourceChip: React.FC<SourceChipProps> = ({ source }) => {
  const isTicket = source.type === 'ticket';
  
  const ticketUrl = isTicket && source.url ? source.url : undefined;

  const docUrl = !isTicket && source.url ? source.url : undefined;


  const tooltipText = isTicket
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
        icon={isTicket ? <TicketIcon /> : <DocIcon />}
        label={`[${source.index}] ${truncateText(source.title, 40)}`}
        variant="outlined"
        color={isTicket ? 'warning' : 'primary'}
        component={ticketUrl || docUrl ? 'a' : 'div'}
        href={ticketUrl || docUrl}
        target={ticketUrl || docUrl ? '_blank' : undefined}
        clickable={!!(ticketUrl || docUrl)}
        className="source-chip"
        sx={{ 
          maxWidth: 300,
          cursor: ticketUrl || docUrl ? 'pointer' : 'default',
        }}
      />
    </Tooltip>
  );
};