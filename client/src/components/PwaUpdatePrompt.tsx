import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocale } from '../i18n';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, reg) {
      setRegistration(reg);
    },
  });

  useEffect(() => {
    if (!registration) return;

    const check = () => {
      void registration.update();
    };

    // Browsers only check for SW updates on navigation; poll while the tab is open.
    const intervalId = window.setInterval(check, UPDATE_CHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };

    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [registration]);

  if (!needRefresh || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    setNeedRefresh(false);
  };

  const update = () => {
    void updateServiceWorker(true);
  };

  return (
    <Paper
      elevation={8}
      role="status"
      sx={{
        position: 'fixed',
        left: 16,
        right: 16,
        // Sit above the mobile bottom nav (~5.5rem) / closer to the edge on desktop.
        bottom: {
          xs: 'calc(5.5rem + 12px + env(safe-area-inset-bottom, 0px))',
          lg: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        },
        zIndex: (theme) => theme.zIndex.snackbar,
        maxWidth: 480,
        mx: 'auto',
        p: 2,
        display: 'flex',
        gap: 1.5,
        alignItems: 'flex-start',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          mt: 0.25,
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <SystemUpdateAltIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
          {t('pwa.updateTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {t('pwa.updateBody')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={dismiss}>
            {t('pwa.updateLater')}
          </Button>
          <Button size="small" variant="contained" color="secondary" onClick={update}>
            {t('pwa.updateCta')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
