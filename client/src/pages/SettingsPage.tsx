import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  ListSubheader,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { api } from '../services/api';
import { AI_MODELS, DEFAULT_AI_MODEL, isAiModelId, type Settings } from '@career-intelligence/shared';

function aiModelMenuItems(): ReactNode[] {
  const items: ReactNode[] = [];
  let lastGroup = '';
  for (const model of AI_MODELS) {
    if (model.group !== lastGroup) {
      lastGroup = model.group;
      items.push(<ListSubheader key={`group-${model.group}`}>{model.group}</ListSubheader>);
    }
    items.push(
      <MenuItem key={model.id} value={model.id}>
        {model.label}
      </MenuItem>
    );
  }
  return items;
}

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ connected: boolean; provider: string | null; connectedEmail?: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const [s, e] = await Promise.all([api.getSettings(), api.getEmailStatus()]);
    setSettings(s);
    setEmailStatus(e);
  };

  useEffect(() => {
    load();
    const connected = searchParams.get('emailConnected');
    const error = searchParams.get('emailError');
    if (connected) {
      setNotice({ type: 'success', text: `${connected === 'gmail' ? 'Gmail' : 'Outlook'} forbundet!` });
      setSearchParams({});
      load();
    }
    if (error) {
      setNotice({ type: 'error', text: error });
      setSearchParams({});
    }
  }, []);

  const save = async () => {
    if (!settings) return;
    await api.updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const disconnect = async () => {
    await api.disconnectEmail();
    await load();
    setNotice({ type: 'success', text: 'Email afbrudt' });
  };

  if (!settings) return null;

  const selectedAiModel = isAiModelId(settings.preferences?.aiModel || '')
    ? settings.preferences.aiModel
    : DEFAULT_AI_MODEL;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>Indstillinger</Typography>
      {saved && <Alert severity="success">Gemt!</Alert>}
      {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Profil</Typography>
          <TextField label="Navn" fullWidth value={settings.profile.name} onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, name: e.target.value } })} />
          <TextField label="Email" fullWidth value={settings.profile.email} onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, email: e.target.value } })} />
          <TextField label="Telefon" fullWidth value={settings.profile.phone || ''} onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, phone: e.target.value } })} />
          <TextField label="LinkedIn" fullWidth value={settings.profile.linkedIn || ''} onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, linkedIn: e.target.value } })} />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>AI</Typography>
          <Typography variant="body2" color="text.secondary">
            Vælg hvilken model der bruges, når du genererer ansøgninger.
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="ai-model-label">AI-model</InputLabel>
            <Select
              labelId="ai-model-label"
              label="AI-model"
              value={selectedAiModel}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  preferences: {
                    ...settings.preferences,
                    defaultLanguage: settings.preferences?.defaultLanguage || 'da',
                    aiModel: e.target.value,
                  },
                })
              }
            >
              {aiModelMenuItems()}
            </Select>
            <FormHelperText>
              {AI_MODELS.find((m) => m.id === selectedAiModel)?.description}
            </FormHelperText>
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Email-integration</Typography>

          {emailStatus?.connected ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={emailStatus.provider === 'gmail' ? 'Gmail' : 'Outlook'} color="success" size="small" />
                <Typography variant="body2">{emailStatus.connectedEmail}</Typography>
              </Box>
              <Button variant="outlined" color="error" onClick={disconnect}>Afbryd forbindelse</Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Forbind Gmail eller Outlook for at sende ansøgninger med PDF-vedhæftninger direkte fra appen.
              </Typography>
              <Button variant="contained" startIcon={<GoogleIcon />} onClick={() => api.connectEmail('google')}>
                Forbind Gmail
              </Button>
              <Button variant="outlined" startIcon={<MailOutlineIcon />} onClick={() => api.connectEmail('microsoft')}>
                Forbind Outlook
              </Button>
              <Typography variant="caption" color="text.secondary">
                Kræver GOOGLE_CLIENT_ID/SECRET eller MICROSOFT_CLIENT_ID/SECRET i .env
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="contained" size="large" onClick={save}>Gem indstillinger</Button>
    </Box>
  );
}
