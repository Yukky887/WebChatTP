import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, StyledEngineProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

// Подключаем стили
import './styles/global.css';
import './styles/chat.css';
import './styles/search.css';
import './styles/admin.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);