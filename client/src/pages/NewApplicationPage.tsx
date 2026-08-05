import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import { api } from '../services/api';
import { useLocale } from '../i18n';

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [tab, setTab] = useState(0);
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const app = await api.createApplication(
        tab === 0 ? { url } : { manualText, companyName, title }
      );
      navigate(`/applications/${app._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('newApplication.createError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>{t('newApplication.title')}</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={t('newApplication.tabLink')} />
        <Tab label={t('newApplication.tabManual')} />
      </Tabs>

      {tab === 0 ? (
        <TextField
          fullWidth
          label={t('newApplication.jobLink')}
          placeholder="https://www.jobindex.dk/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ mb: 2 }}
        />
      ) : (
        <>
          <TextField fullWidth label={t('newApplication.jobTitle')} value={title} onChange={(e) => setTitle(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label={t('newApplication.company')} value={companyName} onChange={(e) => setCompanyName(e.target.value)} sx={{ mb: 2 }} />
          <TextField
            fullWidth
            multiline
            rows={8}
            label={t('newApplication.jobText')}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            sx={{ mb: 2 }}
          />
        </>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={loading || (tab === 0 ? !url : !manualText)}
        onClick={handleSubmit}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
      >
        {loading ? t('newApplication.creating') : t('newApplication.create')}
      </Button>
    </Box>
  );
}
