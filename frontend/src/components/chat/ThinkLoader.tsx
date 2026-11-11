import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import {
  LOADER_COLS, LOADER_ROWS, LOADER_FPS, LOADER_PAL, LOADER_FRAMES,
} from './loaderFrames';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Кадр ASCII-анимации -> HTML (пробелы прозрачны, символы окрашены в оттенки серого). */
function frameHTML(idx: number): string {
  const [chars, colors] = LOADER_FRAMES[idx];
  let out = '';
  for (let r = 0; r < LOADER_ROWS; r++) {
    let line = '';
    let run = '';
    let runK = -1;
    const flush = () => {
      if (runK >= 0) {
        line += `<span style="color:${LOADER_PAL[runK]}">${esc(run)}</span>`;
        run = '';
        runK = -1;
      }
    };
    for (let x = 0; x < LOADER_COLS; x++) {
      const i = r * LOADER_COLS + x;
      const ch = chars[i];
      if (ch === ' ') {
        flush();
        line += ' ';
        runK = -1;
        continue;
      }
      const ki = parseInt(colors[i], 16);
      if (ki !== runK) {
        flush();
        runK = ki;
      }
      run += ch;
    }
    flush();
    out += line + (r < LOADER_ROWS - 1 ? '\n' : '');
  }
  return out;
}

/**
 * Лоадер «агент думает...»: танцующий котик с дискошаром,
 * собранный из ASCII-символов (кадры сгенерированы в loaderFrames.ts).
 */
export const ThinkLoader: React.FC = () => {
  const frames = useMemo(() => LOADER_FRAMES.map((_, i) => frameHTML(i)), []);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setFrame((v) => (v + 1) % frames.length),
      LOADER_FPS,
    );
    return () => clearInterval(timer);
  }, [frames]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 2 }}>
      <Box
        component="pre"
        sx={{
          zoom: 0.62,
          m: 0,
          fontFamily: 'Menlo, "Courier New", monospace',
          fontSize: 9,
          lineHeight: 1,
          letterSpacing: 0,
          whiteSpace: 'pre',
          userSelect: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: frames[frame] }}
      />
      <Typography variant="body2" sx={{ color: '#555', mt: 1, letterSpacing: 0.4 }}>
        агент думает...
      </Typography>
    </Box>
  );
};
