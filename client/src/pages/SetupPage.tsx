import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import LanguageSwitcher from '../components/layout/LanguageSwitcher';
import { useLocale } from '../i18n';

export default function SetupPage() {
  const { user, loading, setupRequired, setup } = useAuth();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !setupRequired) {
    return <Navigate to={user ? '/' : '/login'} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError(t('setup.passwordTooShort'));
      return;
    }
    setSubmitting(true);
    try {
      await setup(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <LanguageSwitcher variant="onLight" />
      </Box>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }} elevation={2}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          {t('setup.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('setup.subtitle')}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label={t('setup.name')} value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField
            label={t('setup.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            fullWidth
          />
          <TextField
            label={t('setup.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            helperText={t('setup.passwordHelp')}
            autoComplete="new-password"
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={submitting || loading}>
            {submitting ? t('setup.submitting') : t('setup.submit')}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
