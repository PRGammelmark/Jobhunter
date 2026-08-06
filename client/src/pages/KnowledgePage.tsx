import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Fab,
  Skeleton,
  LinearProgress,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import { api } from '../services/api';
import {
  ABOUT_ME_MAX_WORDS,
  countWords,
  normalizeSkillConfidence,
  type KnowledgeEntry,
  type KnowledgeEntryType,
} from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import { PageHeader } from '../ui';

const TYPE_ORDER: KnowledgeEntryType[] = [
  'employment',
  'education',
  'skill',
  'project',
  'achievement',
  'story',
];

function formatEmploymentPeriod(entry: KnowledgeEntry, present: string): string | null {
  const emp = entry.employment;
  if (!emp) return null;
  const start = emp.startDate || '';
  const end = emp.isCurrent ? present : emp.endDate || '';
  if (!start && !end) return null;
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function EntryCard({ entry, onOpen }: { entry: KnowledgeEntry; onOpen: () => void }) {
  const { t } = useLocale();
  const confidence = entry.type === 'skill' ? normalizeSkillConfidence(entry.confidence) : null;

  return (
    <Card sx={{ mb: 1 }}>
      <CardActionArea onClick={onOpen}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom={Boolean(confidence != null || entry.description || entry.type === 'employment')}>
            {entry.title}
          </Typography>
          {confidence != null && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(confidence / 5) * 100}
                  sx={{ flex: 1, height: 6, borderRadius: 3 }}
                  color={confidence >= 4 ? 'success' : confidence >= 3 ? 'warning' : 'error'}
                />
                <Typography variant="caption" fontWeight={600}>{confidence}/5</Typography>
              </Box>
              {entry.confidenceLabel && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {entry.confidenceLabel}
                </Typography>
              )}
            </>
          )}
          {entry.type === 'employment' && entry.employment && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {[entry.employment.role, entry.employment.company].filter(Boolean).join(' · ')}
              {formatEmploymentPeriod(entry, t('common.present')) && ` · ${formatEmploymentPeriod(entry, t('common.present'))}`}
              {entry.employment.isCurrent && ` · ${t('knowledge.employment.current')}`}
            </Typography>
          )}
          {entry.description && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {entry.description}
            </Typography>
          )}
          {entry.relatedEntryIds.length > 0 && (
            <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
              {t('knowledge.entry.relatedCount', { count: entry.relatedEntryIds.length })}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function AboutMeSection({
  value,
  onSaved,
}: {
  value: string;
  onSaved: (next: string) => void;
}) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  const wordCount = countWords(draft);
  const overLimit = wordCount > ABOUT_ME_MAX_WORDS;

  const save = async () => {
    if (overLimit) {
      setError(t('knowledge.aboutMe.maxWords', { max: ABOUT_ME_MAX_WORDS }));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.updateSettings({ aboutMe: draft });
      onSaved(draft);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('knowledge.aboutMe.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('knowledge.aboutMe.title')}
        </Typography>
        {!editing && (
          <Button size="small" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
            {t('knowledge.aboutMe.edit')}
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          {editing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label={t('knowledge.aboutMe.label')}
                fullWidth
                multiline
                minRows={8}
                maxRows={20}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('knowledge.aboutMe.placeholder')}
                error={overLimit}
                helperText={
                  error ||
                  t('knowledge.aboutMe.wordCount', { count: wordCount, max: ABOUT_ME_MAX_WORDS })
                }
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setDraft(value);
                    setEditing(false);
                    setError('');
                  }}
                  disabled={saving}
                >
                  {t('knowledge.aboutMe.cancel')}
                </Button>
                <Button
                  variant="contained"
                  color={saved ? 'success' : 'primary'}
                  onClick={save}
                  disabled={saving || overLimit}
                  startIcon={
                    saving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : saved ? (
                      <CheckIcon />
                    ) : undefined
                  }
                >
                  {saving ? t('knowledge.aboutMe.saving') : t('knowledge.aboutMe.save')}
                </Button>
              </Box>
            </Box>
          ) : value.trim() ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {value}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('knowledge.aboutMe.empty', { max: ABOUT_ME_MAX_WORDS })}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default function KnowledgePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [aboutMe, setAboutMe] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getKnowledge(), api.getSettings()])
      .then(([knowledge, settings]) => {
        setEntries(knowledge);
        setAboutMe(settings.aboutMe || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        label: t(`knowledge.types.${type}`),
        entries: entries.filter((e) => e.type === type),
      })),
    [entries, t]
  );

  return (
    <Box sx={{ pb: 10 }}>
      <PageHeader title={t('knowledge.title')} subtitle={t('knowledge.subtitle')} />

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />)
      ) : (
        <>
          <AboutMeSection value={aboutMe} onSaved={setAboutMe} />

          {grouped.map((group) => (
            <Box key={group.type} sx={{ mb: 3.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mb: 1.25,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, minWidth: 0 }}>
                  <Typography variant="h6" fontWeight={700}>
                    {group.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.entries.length}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(`/knowledge/new?type=${group.type}`)}
                  aria-label={t('knowledge.group.addAria', { type: group.label.toLowerCase() })}
                >
                  {t('knowledge.group.add')}
                </Button>
              </Box>
              {group.entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t('knowledge.group.empty')}
                </Typography>
              ) : (
                group.entries.map((entry) => (
                  <EntryCard
                    key={entry._id}
                    entry={entry}
                    onOpen={() => navigate(`/knowledge/${entry._id}`)}
                  />
                ))
              )}
            </Box>
          ))}
        </>
      )}

      <Fab
        variant="extended"
        color="primary"
        aria-label={t('knowledge.fab.addAria')}
        sx={{
          position: 'fixed',
          bottom: 'calc(5.5rem + env(safe-area-inset-bottom))',
          right: 16,
          zIndex: 1100,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
        onClick={() => navigate('/knowledge/new')}
      >
        <AddIcon sx={{ mr: 1 }} />
        {t('knowledge.fab.add')}
      </Fab>
    </Box>
  );
}
