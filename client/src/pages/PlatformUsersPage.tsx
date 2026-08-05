import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { PlatformUser } from '@career-intelligence/shared';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { useLocale } from '../i18n';

export default function PlatformUsersPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setUsers(await api.getPlatformUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('platformUsers.errorLoad'));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createPlatformUser({ name, email, password });
      setOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('platformUsers.errorCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm(t('platformUsers.confirmDeactivate'))) return;
    try {
      await api.deletePlatformUser(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('platformUsers.errorDelete'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('platformUsers.title')}
        </Typography>
        <Button variant="contained" onClick={() => setOpen(true)}>
          {t('platformUsers.addUser')}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('platformUsers.subtitle')}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {users.map((u) => (
          <Box
            key={u._id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={600}>{u.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {u.email}
              </Typography>
            </Box>
            <Chip size="small" label={u.platformRole} />
            <Chip
              size="small"
              label={u.status}
              color={u.status === 'active' ? 'success' : 'default'}
              variant="outlined"
            />
            {u._id !== user?._id && u.status === 'active' && (
              <IconButton aria-label={t('platformUsers.deleteAria')} onClick={() => void onDelete(u._id)} size="small">
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        ))}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('platformUsers.dialog.title')}</DialogTitle>
        <Box component="form" onSubmit={onCreate}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label={t('platformUsers.dialog.name')} value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
            <TextField
              label={t('platformUsers.dialog.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={t('platformUsers.dialog.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText={t('platformUsers.dialog.passwordHelp')}
              fullWidth
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('platformUsers.dialog.cancel')}</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {t('platformUsers.dialog.create')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
