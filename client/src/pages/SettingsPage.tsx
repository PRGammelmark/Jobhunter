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
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GoogleIcon from '@mui/icons-material/Google';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { PageHeader } from '../ui';
import { api } from '../services/api';
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  getDefaultCoverLetterPrompt,
  isAiModelId,
  normalizeCoverLetterPrompt,
  sanitizeCoverLetterPrompt,
  type AppLanguage,
  type Settings,
} from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import {
  useDisconnectEmail,
  useEmailStatus,
  useSettings,
  useUpdateSettings,
} from '../queries';

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
  const { locale, setLocale, t } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: loadedSettings } = useSettings();
  const { data: emailStatus, refetch: refetchEmailStatus } = useEmailStatus();
  const updateSettings = useUpdateSettings();
  const disconnectEmail = useDisconnectEmail();

  const [draft, setDraft] = useState<Settings | null>(null);
  const [coverLetterPrompt, setCoverLetterPrompt] = useState(() => getDefaultCoverLetterPrompt(locale));
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loadedSettings || draft) return;
    setDraft(loadedSettings);
    const raw = loadedSettings.coverLetterPrompt?.trim();
    setCoverLetterPrompt(
      raw ? normalizeCoverLetterPrompt(raw) : getDefaultCoverLetterPrompt(locale)
    );
  }, [loadedSettings, draft, locale]);

  useEffect(() => {
    const connected = searchParams.get('emailConnected');
    const error = searchParams.get('emailError');
    if (connected) {
      setNotice({
        type: 'success',
        text: t('settings.emailConnected', { provider: connected === 'gmail' ? 'Gmail' : 'Outlook' }),
      });
      setSearchParams({});
      void refetchEmailStatus();
    }
    if (error) {
      setNotice({ type: 'error', text: error });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, t, refetchEmailStatus]);

  useEffect(() => {
    const otherLocale: AppLanguage = locale === 'da' ? 'en' : 'da';
    if (coverLetterPrompt === getDefaultCoverLetterPrompt(otherLocale)) {
      setCoverLetterPrompt(getDefaultCoverLetterPrompt(locale));
    }
  }, [locale, coverLetterPrompt]);

  const save = async () => {
    if (!draft) return;
    const sanitized = sanitizeCoverLetterPrompt(coverLetterPrompt);
    const updated = await updateSettings.mutateAsync({
      ...draft,
      coverLetterPrompt: sanitized || '',
      preferences: {
        ...draft.preferences,
        defaultLanguage: locale,
      },
    });
    setDraft(updated);
    setCoverLetterPrompt(
      updated.coverLetterPrompt?.trim()
        ? normalizeCoverLetterPrompt(updated.coverLetterPrompt)
        : getDefaultCoverLetterPrompt(locale)
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const disconnect = async () => {
    await disconnectEmail.mutateAsync();
    setNotice({ type: 'success', text: t('settings.emailDisconnected') });
  };

  const restoreCoverLetterPrompt = () => {
    setCoverLetterPrompt(getDefaultCoverLetterPrompt(locale));
  };

  if (!draft) return null;

  const selectedAiModel = isAiModelId(draft.preferences?.aiModel || '')
    ? draft.preferences.aiModel
    : DEFAULT_AI_MODEL;

  const promptCustomized = coverLetterPrompt !== getDefaultCoverLetterPrompt(locale);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <PageHeader title={t('settings.title')} />
      {saved && <Alert severity="success">{t('settings.saved')}</Alert>}
      {notice && <Alert severity={notice.type} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('settings.language')}</Typography>
          <FormControl fullWidth>
            <InputLabel id="language-label">{t('settings.language')}</InputLabel>
            <Select
              labelId="language-label"
              label={t('settings.language')}
              value={locale}
              onChange={(e) => {
                const nextLocale = e.target.value as AppLanguage;
                setLocale(nextLocale);
                setDraft({
                  ...draft,
                  preferences: {
                    ...draft.preferences,
                    defaultLanguage: nextLocale,
                  },
                });
              }}
            >
              <MenuItem value="da">{t('language.da')}</MenuItem>
              <MenuItem value="en">{t('language.en')}</MenuItem>
            </Select>
            <FormHelperText>{t('settings.languageHelp')}</FormHelperText>
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('settings.profile')}</Typography>
          <TextField label={t('settings.name')} fullWidth value={draft.profile.name} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, name: e.target.value } })} />
          <TextField label={t('settings.email')} fullWidth value={draft.profile.email} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, email: e.target.value } })} />
          <TextField label={t('settings.phone')} fullWidth value={draft.profile.phone || ''} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, phone: e.target.value } })} />
          <TextField label={t('settings.linkedIn')} fullWidth value={draft.profile.linkedIn || ''} onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, linkedIn: e.target.value } })} />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="subtitle1" fontWeight={600}>{t('settings.aiTitle')}</Typography>
            {promptCustomized && (
              <Chip size="small" label={t('settings.promptCustomized')} color="primary" variant="outlined" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            {t('settings.aiHelp')}
          </Typography>

          <FormControl fullWidth>
            <InputLabel id="ai-model-label">{t('settings.aiModel')}</InputLabel>
            <Select
              labelId="ai-model-label"
              label={t('settings.aiModel')}
              value={selectedAiModel}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  preferences: {
                    ...draft.preferences,
                    defaultLanguage: draft.preferences?.defaultLanguage || 'da',
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

          <Typography variant="subtitle2" fontWeight={600}>
            {t('settings.coverLetterPrompt')}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={12}
            maxRows={28}
            value={coverLetterPrompt}
            onChange={(e) => setCoverLetterPrompt(e.target.value)}
            slotProps={{
              input: {
                sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: 16 },
              },
            }}
          />
          <Box>
            <Button
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={restoreCoverLetterPrompt}
              disabled={!promptCustomized}
            >
              {t('settings.restoreDefault')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('settings.emailIntegration')}</Typography>

          {emailStatus?.connected ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={emailStatus.provider === 'gmail' ? 'Gmail' : 'Outlook'} color="success" size="small" />
                <Typography variant="body2">{emailStatus.connectedEmail}</Typography>
              </Box>
              <Button variant="outlined" color="error" onClick={disconnect}>{t('settings.disconnect')}</Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('settings.emailHelp')}
              </Typography>
              <Button variant="contained" startIcon={<GoogleIcon />} onClick={() => api.connectEmail('google')}>
                {t('settings.connectGmail')}
              </Button>
              <Button variant="outlined" startIcon={<MailOutlineIcon />} onClick={() => api.connectEmail('microsoft')}>
                {t('settings.connectOutlook')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {t('settings.emailEnvHint')}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Button variant="contained" size="large" onClick={save} disabled={updateSettings.isPending}>
        {t('settings.save')}
      </Button>
    </Box>
  );
}
