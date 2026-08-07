import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { LocaleProvider } from './i18n';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import PortraitLock from './components/PortraitLock';
import { theme } from './theme';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <LocaleProvider>
            <App />
            <PwaInstallPrompt />
            <PwaUpdatePrompt />
            <PortraitLock />
          </LocaleProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
