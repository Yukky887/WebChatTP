/** Компонент для рендеринга Markdown */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Typography, Link, Table, TableBody, TableCell, TableHead,
  TableRow, Paper, Box, Divider,
} from '@mui/material';

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  isUser = false,
}) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
            {children}
          </Typography>
        ),
        h2: ({ children }) => (
          <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
            {children}
          </Typography>
        ),
        h3: ({ children }) => (
          <Typography variant="h6" gutterBottom sx={{ mt: 1.5 }}>
            {children}
          </Typography>
        ),
        h4: ({ children }) => (
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>
            {children}
          </Typography>
        ),

        p: ({ children }) => (
          <Typography variant="body1" sx={{ mb: 1, lineHeight: 1.7 }}>
            {children}
          </Typography>
        ),

        // ИСПРАВЛЕННЫЕ СПИСКИ
        ul: ({ children }) => (
          <ul style={{ paddingLeft: 24, margin: '8px 0', listStyleType: 'disc' }}>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol style={{ paddingLeft: 24, margin: '8px 0', listStyleType: 'decimal' }}>
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li style={{ marginBottom: 4, lineHeight: 1.6 }}>
            <span>{children}</span>
          </li>
        ),

        strong: ({ children }) => (
          <strong style={{ fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ fontStyle: 'italic' }}>{children}</em>
        ),

        a: ({ href, children }) => (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: 'primary.main',
              textDecoration: 'underline',
            }}
          >
            {children}
          </Link>
        ),

        code: ({ className, children }) => {
          const isBlock = className?.includes('language-') || String(children).includes('\n');
          
          if (isBlock) {
            return (
              <pre style={{
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: 12,
                borderRadius: 6,
                overflowX: 'auto',
                margin: '8px 0',
                fontSize: '0.875rem',
                fontFamily: 'monospace',
              }}>
                <code>{children}</code>
              </pre>
            );
          }
          
          return (
            <code style={{
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              padding: '2px 6px',
              borderRadius: 3,
              fontFamily: 'monospace',
              fontSize: '0.875em',
            }}>
              {children}
            </code>
          );
        },

        pre: ({ children }) => (
          <pre style={{
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            padding: 12,
            borderRadius: 6,
            overflowX: 'auto',
            margin: '8px 0',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
          }}>
            {children}
          </pre>
        ),

        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: '4px solid #1976d2',
            paddingLeft: 12,
            margin: '8px 0',
            color: '#555',
          }}>
            {children}
          </blockquote>
        ),

        hr: () => <Divider sx={{ my: 2 }} />,

        table: ({ children }) => (
          <Table size="small" sx={{ my: 1, display: 'table' }}>
            {children}
          </Table>
        ),
        thead: ({ children }) => <TableHead>{children}</TableHead>,
        tbody: ({ children }) => <TableBody>{children}</TableBody>,
        tr: ({ children }) => <TableRow>{children}</TableRow>,
        th: ({ children }) => (
          <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>
            {children}
          </TableCell>
        ),
        td: ({ children }) => <TableCell>{children}</TableCell>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};