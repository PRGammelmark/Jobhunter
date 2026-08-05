import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  Card,
  CardContent,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { api } from '../services/api';
import { normalizeSkillConfidence, type EmploymentDetails, type KnowledgeEntry, type KnowledgeEntryType } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

const ENTRY_TYPES: KnowledgeEntryType[] = [
  'employment',
  'education',
  'skill',
  'project',
  'achievement',
  'story',
];

function createEmptyEntry(type: KnowledgeEntryType): Partial<KnowledgeEntry> {
  const base: Partial<KnowledgeEntry> = {
    title: '',
    type,
    description: '',
    keywords: [],
    relatedEntryIds: [],
    metrics: [],
    results: [],
    cases: [],
    whenToUse: '',
  };
  if (type === 'skill') {
    return { ...base, confidence: 3 };
  }
  if (type === 'employment') {
    return {
      ...base,
      employment: { company: '', role: '', isCurrent: false, responsibilities: [] },
    };
  }
  return base;
}

function parseEntryType(value: string | null): KnowledgeEntryType {
  if (value && ENTRY_TYPES.includes(value as KnowledgeEntryType)) {
    return value as KnowledgeEntryType;
  }
  return 'skill';
}

export default function KnowledgeEntryPage() {
  const { t } = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';

  const [entry, setEntry] = useState<Partial<KnowledgeEntry>>(() =>
    createEmptyEntry(parseEntryType(searchParams.get('type')))
  );
  const [allEntries, setAllEntries] = useState<KnowledgeEntry[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [responsibilityInput, setResponsibilityInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean((location.state as { justSaved?: boolean } | null)?.justSaved));

  const requestedType = searchParams.get('type');
  const buildEmploymentTitle = (employment?: EmploymentDetails): string => {
    if (!employment?.role && !employment?.company) return '';
    if (employment.role && employment.company) {
      return t('knowledgeEntry.employment.autoTitle', {
        role: employment.role,
        company: employment.company,
      });
    }
    return employment.role || employment.company;
  };

  useEffect(() => {
    api.getKnowledge().then(setAllEntries);
    if (!isNew && id) {
      api.getKnowledgeEntry(id).then(setEntry);
    } else if (isNew) {
      setEntry(createEmptyEntry(parseEntryType(requestedType)));
    }
  }, [id, isNew, requestedType]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  const updateEmployment = (updates: Partial<EmploymentDetails>) => {
    const employment = { ...entry.employment, company: '', role: '', ...updates } as EmploymentDetails;
    const autoTitle = buildEmploymentTitle(employment);
    setEntry({
      ...entry,
      employment,
      title: autoTitle || entry.title,
    });
  };

  const save = async () => {
    const payload = { ...entry };
    if (payload.type === 'employment' && payload.employment) {
      if (!payload.title?.trim()) {
        payload.title = buildEmploymentTitle(payload.employment);
      }
    }
    if (payload.type === 'skill') {
      payload.confidence = normalizeSkillConfidence(payload.confidence);
    } else {
      delete payload.confidence;
      delete payload.confidenceLabel;
    }

    setSaving(true);
    setSaved(false);
    try {
      if (isNew) {
        const created = await api.createKnowledge(payload);
        navigate(`/knowledge/${created._id}`, { replace: true, state: { justSaved: true } });
      } else if (id) {
        await api.updateKnowledge(id, payload);
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setEntry({ ...entry, keywords: [...(entry.keywords || []), keywordInput.trim()] });
      setKeywordInput('');
    }
  };

  const addResponsibility = () => {
    if (!responsibilityInput.trim()) return;
    const responsibilities = [...(entry.employment?.responsibilities || []), responsibilityInput.trim()];
    updateEmployment({ responsibilities });
    setResponsibilityInput('');
  };

  const relatedEntries = allEntries.filter((e) => entry.relatedEntryIds?.includes(e._id));
  const isEmployment = entry.type === 'employment';
  const canSave = isEmployment
    ? Boolean(entry.employment?.company?.trim() && entry.employment?.role?.trim())
    : Boolean(entry.title?.trim());

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>{isNew ? t('knowledgeEntry.newTitle') : entry.title}</Typography>

      <FormControl fullWidth>
        <InputLabel>{t('knowledgeEntry.type')}</InputLabel>
        <Select
          value={entry.type || 'skill'}
          label={t('knowledgeEntry.type')}
          onChange={(e) => {
            const type = e.target.value as KnowledgeEntryType;
            if (type === 'employment' && !entry.employment) {
              setEntry({
                ...entry,
                type,
                confidence: undefined,
                confidenceLabel: undefined,
                employment: { company: '', role: '', isCurrent: false, responsibilities: [] },
              });
            } else if (type === 'skill') {
              setEntry({
                ...entry,
                type,
                confidence: normalizeSkillConfidence(entry.confidence),
              });
            } else {
              setEntry({
                ...entry,
                type,
                confidence: undefined,
                confidenceLabel: undefined,
              });
            }
          }}
        >
          {ENTRY_TYPES.map((type) => (
            <MenuItem key={type} value={type}>{t(`knowledgeEntry.types.${type}`)}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isEmployment ? (
        <>
          <TextField
            label={t('knowledgeEntry.employment.company')}
            fullWidth
            required
            value={entry.employment?.company || ''}
            onChange={(e) => updateEmployment({ company: e.target.value })}
          />
          <TextField
            label={t('knowledgeEntry.employment.role')}
            fullWidth
            required
            value={entry.employment?.role || ''}
            onChange={(e) => updateEmployment({ role: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label={t('knowledgeEntry.employment.startDate')}
              placeholder={t('knowledgeEntry.employment.startDatePlaceholder')}
              sx={{ flex: 1, minWidth: 140 }}
              value={entry.employment?.startDate || ''}
              onChange={(e) => updateEmployment({ startDate: e.target.value })}
            />
            <TextField
              label={t('knowledgeEntry.employment.endDate')}
              placeholder={t('knowledgeEntry.employment.endDatePlaceholder')}
              sx={{ flex: 1, minWidth: 140 }}
              disabled={entry.employment?.isCurrent}
              value={entry.employment?.isCurrent ? '' : entry.employment?.endDate || ''}
              onChange={(e) => updateEmployment({ endDate: e.target.value })}
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={entry.employment?.isCurrent || false}
                onChange={(e) =>
                  updateEmployment({
                    isCurrent: e.target.checked,
                    endDate: e.target.checked ? undefined : entry.employment?.endDate,
                  })
                }
              />
            }
            label={t('knowledgeEntry.employment.isCurrent')}
          />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label={t('knowledgeEntry.employment.location')}
              sx={{ flex: 1, minWidth: 140 }}
              value={entry.employment?.location || ''}
              onChange={(e) => updateEmployment({ location: e.target.value })}
            />
            <FormControl sx={{ flex: 1, minWidth: 140 }}>
              <InputLabel>{t('knowledgeEntry.employment.employmentType')}</InputLabel>
              <Select
                value={entry.employment?.employmentType || ''}
                label={t('knowledgeEntry.employment.employmentType')}
                onChange={(e) => updateEmployment({ employmentType: e.target.value as EmploymentDetails['employmentType'] })}
              >
                <MenuItem value="">{t('knowledgeEntry.employment.typeNotSet')}</MenuItem>
                {(['full_time', 'part_time', 'contract', 'freelance', 'internship'] as const).map((value) => (
                  <MenuItem key={value} value={value}>{t(`knowledgeEntry.employment.types.${value}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TextField
            label={t('knowledgeEntry.employment.listTitle')}
            fullWidth
            value={entry.title || ''}
            onChange={(e) => setEntry({ ...entry, title: e.target.value })}
            helperText={t('knowledgeEntry.employment.listTitleHelp')}
          />
        </>
      ) : (
        <TextField
          label={t('knowledgeEntry.title')}
          fullWidth
          value={entry.title || ''}
          onChange={(e) => setEntry({ ...entry, title: e.target.value })}
        />
      )}

      <TextField
        label={t('knowledgeEntry.description')}
        fullWidth
        multiline
        rows={4}
        value={entry.description || ''}
        onChange={(e) => setEntry({ ...entry, description: e.target.value })}
        placeholder={isEmployment ? t('knowledgeEntry.descriptionPlaceholderEmployment') : undefined}
      />

      {isEmployment && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>{t('knowledgeEntry.responsibilities.title')}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('knowledgeEntry.responsibilities.placeholder')}
              value={responsibilityInput}
              onChange={(e) => setResponsibilityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addResponsibility()}
            />
            <Button onClick={addResponsibility}>{t('knowledgeEntry.responsibilities.add')}</Button>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {entry.employment?.responsibilities?.map((r, i) => (
              <Chip
                key={`${r}-${i}`}
                label={r}
                size="small"
                onDelete={() =>
                  updateEmployment({
                    responsibilities: entry.employment?.responsibilities?.filter((_, idx) => idx !== i),
                  })
                }
              />
            ))}
          </Box>
        </Box>
      )}

      {entry.type === 'skill' && (
        <Box>
          <Typography gutterBottom>{t('knowledgeEntry.skill.confidence', { value: normalizeSkillConfidence(entry.confidence) })}</Typography>
          <Slider
            value={normalizeSkillConfidence(entry.confidence)}
            onChange={(_, v) => setEntry({ ...entry, confidence: v as number })}
            min={1}
            max={5}
            step={1}
            marks
            valueLabelDisplay="auto"
          />
          <TextField
            label={t('knowledgeEntry.skill.confidenceLabel')}
            fullWidth
            size="small"
            placeholder={t('knowledgeEntry.skill.confidenceLabelPlaceholder')}
            value={entry.confidenceLabel || ''}
            onChange={(e) => setEntry({ ...entry, confidenceLabel: e.target.value })}
          />
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" gutterBottom>{t('knowledgeEntry.keywords')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField size="small" fullWidth value={keywordInput} onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addKeyword()} />
          <Button onClick={addKeyword}>{t('knowledgeEntry.keywordsAdd')}</Button>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {entry.keywords?.map((k) => <Chip key={k} label={k} size="small" onDelete={() => setEntry({ ...entry, keywords: entry.keywords?.filter((x) => x !== k) })} />)}
        </Box>
      </Box>

      <FormControl fullWidth>
        <InputLabel>{t('knowledgeEntry.relatedEntries')}</InputLabel>
        <Select
          multiple
          value={entry.relatedEntryIds || []}
          label={t('knowledgeEntry.relatedEntries')}
          onChange={(e) => setEntry({ ...entry, relatedEntryIds: e.target.value as string[] })}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(selected as string[]).map((sid) => {
                const found = allEntries.find((e) => e._id === sid);
                return <Chip key={sid} label={found?.title || sid} size="small" />;
              })}
            </Box>
          )}
        >
          {allEntries.filter((e) => e._id !== id).map((e) => (
            <MenuItem key={e._id} value={e._id}>{e.title}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {relatedEntries.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>{t('knowledgeEntry.graph')}</Typography>
            <Typography variant="body2">{entry.title} → {relatedEntries.map((e) => e.title).join(' → ')}</Typography>
          </CardContent>
        </Card>
      )}

      <TextField label={t('knowledgeEntry.whenToUse')} fullWidth multiline rows={2} value={entry.whenToUse || ''} onChange={(e) => setEntry({ ...entry, whenToUse: e.target.value })} />

      <Button
        variant="contained"
        size="large"
        color={saved ? 'success' : 'primary'}
        onClick={save}
        disabled={!canSave || saving}
        startIcon={
          saving ? (
            <CircularProgress size={18} color="inherit" />
          ) : saved ? (
            <CheckIcon />
          ) : undefined
        }
      >
        {saving ? t('knowledgeEntry.saving') : saved ? t('knowledgeEntry.saved') : t('knowledgeEntry.save')}
      </Button>
    </Box>
  );
}
