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
      setResearchError('Angiv virksomhedsnavn eller CVR-nummer');
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
      setResearchError(err instanceof Error ? err.message : 'Kunne ikke hente virksomhedsdata');
    } finally {
      setResearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('Virksomhedsnavn er påkrævet');
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
      setError(e instanceof Error ? e.message : 'Fejl ved oprettelse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <Typography variant="h5" fontWeight={700}>Ny virksomhed</Typography>
      <Typography variant="body2" color="text.secondary">
        Opret en virksomhed uden stillingsopslag — fx til uopfordrede ansøgninger eller research.
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
              Find og autoudfyld
            </Button>
          </Box>
          {researchError && <Alert severity="error">{researchError}</Alert>}
          {researchSources && (
            <Alert severity="info">Data hentet fra: {researchSources.join(', ')}</Alert>
          )}
          <TextField
            label="Navn"
            fullWidth
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label="CVR-nummer"
            fullWidth
            placeholder="8 cifre"
            value={form.cvr}
            onChange={(e) => setForm({ ...form, cvr: e.target.value })}
            helperText="Søg med navn eller CVR-nummer"
          />
          <TextField
            label="Beskrivelse"
            fullWidth
            multiline
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label="Branche"
            fullWidth
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
          />
          <TextField
            label="Hjemmeside"
            fullWidth
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
          />
          <TextField
            label="LinkedIn"
            fullWidth
            value={form.linkedIn}
            onChange={(e) => setForm({ ...form, linkedIn: e.target.value })}
          />
          <TextField
            label="Antal ansatte"
            fullWidth
            value={form.employeeCount}
            onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
          />
          <TextField
            label="Lokation"
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
        {loading ? 'Opretter...' : 'Opret virksomhed'}
      </Button>
      <Button fullWidth onClick={() => navigate('/companies')}>
        Annuller
      </Button>
    </Box>
  );
}
