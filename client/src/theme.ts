import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1a1a2e' },
    secondary: { main: '#e94560' },
    background: { default: '#f5f5f7', paper: '#ffffff' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', minHeight: 44 },
        sizeSmall: { paddingLeft: 16, paddingRight: 16 },
        textSizeMedium: { paddingLeft: 16, paddingRight: 16 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: 44, minHeight: 44 },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: { minWidth: 60, padding: '6px 0' },
      },
    },
  },
});
