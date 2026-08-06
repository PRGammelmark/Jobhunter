import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { api } from '../services/api';
import PageBreadcrumbs from '../components/layout/PageBreadcrumbs';
import { useLocale } from '../i18n';

type CompanyForm = {
  name: string;
  cvr: string;
  description: string;
  website: string;
  linkedIn: string;
  industry: string;
  employeeCount: string;
  location: string;
};

const emptyForm: CompanyForm = {
  name: '',
  cvr: '',
  description: '',
  website: '',
  linkedIn: '',
  industry: '',
  employeeCount: '',
  location: '',
};

function mergeResearch(form: CompanyForm, research: Partial<CompanyForm>): CompanyForm {
  const merged = { ...form };
  for (const [key, value] of Object.entries(research)) {
    if (value && key in merged) {
      (merged as Record<string, string>)[key] = value;
    }
  }
  return merged;
}

export default function NewCompanyPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [form, setForm] = useState<CompanyForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [researching, setResearching] = useState(false);
  const [error, setError] = useState('');
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchSources, setResearchSources] = useState<string[] | null>(null);

  const autoFill = async () => {
    const searchName = form.name.trim();
    const searchCvr = form.cvr.trim();
    if (!searchName && !searchCvr) {
      setResearchError(t('newCompany.researchErrorRequired'));
      return;
    }

    setResearching(true);
    setResearchError(null);
    setResearchSources(null);
    try {
      const result = await api.researchCompanyPreview({
        name: searchName || undefined,
        cvr: searchCvr || undefined,
      });
      setForm(mergeResearch(form, result));
      if (result.sources?.length) setResearchSources(result.sources);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : t('newCompany.researchErrorGeneric'));
    } finally {
      setResearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError(t('newCompany.errorNameRequired'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const company = await api.createCompany({
        name: form.name.trim(),
        cvr: form.cvr.trim() || undefined,
        description: form.description.trim() || undefined,
        website: form.website.trim() || undefined,
        linkedIn: form.linkedIn.trim() || undefined,
        industry: form.industry.trim() || undefined,
        employeeCount: form.employeeCount.trim() || undefined,
        location: form.location.trim() || undefined,
      });
      navigate(`/companies/${company._id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('newCompany.errorCreate'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <PageBreadcrumbs
        items={[
          { label: t('nav.companies'), to: '/companies' },
          { label: t('newCompany.title') },
        ]}
      />
      <Typography variant="h5" fontWeight={700}>{t('newCompany.title')}</Typography>
      <Typography variant="body2" color="text.secondary">
        {t('newCompany.subtitle')}
      </Typography>

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <Button
              variant="outlined"
              startIcon={researching ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
              onClick={autoFill}
              disabled={researching || (!form.name.trim() && !form.cvr.trim())}
            >
              {t('newCompany.autoFill')}
            </Button>
          </Box>
          {researchError && <Alert severity="error">{researchError}</Alert>}
          {researchSources && (
            <Alert severity="info">{t('newCompany.researchSources', { sources: researchSources.join(', ') })}</Alert>
          )}
          <TextField
            label={t('newCompany.fields.name')}
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.cvr')}
            fullWidth
            placeholder={t('newCompany.fields.cvrPlaceholder')}
            value={form.cvr}
            onChange={(e) => setForm({ ...form, cvr: e.target.value })}
            helperText={t('newCompany.fields.cvrHelp')}
          />
          <TextField
            label={t('newCompany.fields.description')}
            fullWidth
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.industry')}
            fullWidth
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.website')}
            fullWidth
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.linkedIn')}
            fullWidth
            value={form.linkedIn}
            onChange={(e) => setForm({ ...form, linkedIn: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.employeeCount')}
            fullWidth
            value={form.employeeCount}
            onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
          />
          <TextField
            label={t('newCompany.fields.location')}
            fullWidth
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={loading || !form.name.trim()}
        onClick={handleSubmit}
        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : undefined}
      >
        {loading ? t('newCompany.creating') : t('newCompany.create')}
      </Button>
      <Button fullWidth onClick={() => navigate('/companies')}>
        {t('newCompany.cancel')}
      </Button>
    </Box>
  );
}
