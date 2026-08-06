import { createTheme } from '@mui/material/styles';

/** Bridge theme for screens still on MUI — matches ApplyPilot orange system. */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#ff5722', contrastText: '#ffffff' },
    secondary: { main: '#ff5722', contrastText: '#ffffff' },
    success: { main: '#12b76a' },
    warning: { main: '#f79009' },
    error: { main: '#f04438' },
    info: { main: '#7a5af8' },
    background: { default: '#f4f5f7', paper: '#ffffff' },
    text: { primary: '#1c1d21', secondary: '#6b7280' },
    divider: '#e8eaef',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f4f5f7',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 44,
          borderRadius: 14,
          fontWeight: 600,
          boxShadow: 'none',
        },
        containedPrimary: {
          boxShadow: '0 6px 16px rgb(255 87 34 / 0.28)',
          '&:hover': { boxShadow: '0 8px 18px rgb(255 87 34 / 0.32)' },
        },
        sizeSmall: { paddingLeft: 16, paddingRight: 16 },
        textSizeMedium: { paddingLeft: 16, paddingRight: 16 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { minWidth: 44, minHeight: 44 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: '1px solid #e8eaef',
          boxShadow: '0 1px 2px rgb(16 24 40 / 0.04), 0 4px 16px rgb(16 24 40 / 0.04)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 18 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontWeight: 600 },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          textTransform: 'none',
          fontWeight: 700,
          boxShadow: '0 8px 20px rgb(255 87 34 / 0.35)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 14 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 22 },
      },
    },
  },
});
