import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import TouchAppOutlinedIcon from '@mui/icons-material/TouchAppOutlined';
import { useLocale } from '../i18n';

const STORAGE_KEY = 'applypilot-pwa-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/** Survives React StrictMode remounts — the browser only fires this once. */
let cachedInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    cachedInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('applypilot:beforeinstallprompt'));
  });
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobileDevice(): boolean {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return (coarse && narrow) || uaMobile || iPadOs;
}

function isIos(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export default function PwaInstallPrompt() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => cachedInstallPrompt
  );
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice()) return;
    if (localStorage.getItem(STORAGE_KEY) === '1') return;

    setIos(isIos());
    if (cachedInstallPrompt) setDeferredPrompt(cachedInstallPrompt);

    const syncPrompt = () => setDeferredPrompt(cachedInstallPrompt);
    window.addEventListener('applypilot:beforeinstallprompt', syncPrompt);

    const timer = window.setTimeout(() => setOpen(true), 1200);

    return () => {
      window.removeEventListener('applypilot:beforeinstallprompt', syncPrompt);
      window.clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    cachedInstallPrompt = null;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, '1');
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={dismiss} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 2 }}>
        <Box
          component="img"
          src="/icons/icon-192.png"
          alt=""
          sx={{ width: 40, height: 40, borderRadius: 1.5 }}
        />
        {t('pwa.installTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: ios ? 1.5 : 0 }}>
          {t('pwa.installBody')}
        </Typography>

        {ios ? (
          <List dense disablePadding>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <IosShareIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.iosStep1')}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <AddBoxOutlinedIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.iosStep2')}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem alignItems="flex-start" sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <TouchAppOutlinedIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={t('pwa.iosStep3')}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        ) : !deferredPrompt ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('pwa.androidManual')}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={dismiss}>{t('pwa.dismiss')}</Button>
        {!ios && deferredPrompt && (
          <Button variant="contained" color="secondary" onClick={install}>
            {t('pwa.installCta')}
          </Button>
        )}
        {ios && (
          <Button variant="contained" color="secondary" onClick={dismiss}>
            {t('pwa.gotIt')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
