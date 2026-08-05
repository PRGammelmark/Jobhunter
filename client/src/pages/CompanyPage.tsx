import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Skeleton,
  Divider,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import WishlistButton from '../components/pipeline/WishlistButton';
import type { Application, Company } from '@career-intelligence/shared';
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

function toForm(company: Company): CompanyForm {
  return {
    name: company.name,
    cvr: company.cvr || '',
    description: company.description || '',
    website: company.website || '',
    linkedIn: company.linkedIn || '',
    industry: company.industry || '',
    employeeCount: company.employeeCount || '',
    location: company.location || '',
  };
}

function mergeResearch(form: CompanyForm, research: Partial<CompanyForm>): CompanyForm {
  const merged = { ...form };
  for (const [key, value] of Object.entries(research)) {
    if (value && key in merged) {
      (merged as Record<string, string>)[key] = value;
    }
  }
  return merged;
}

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDate } = useLocale();
  const [company, setCompany] = useState<Company | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [form, setForm] = useState<CompanyForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [researching, setResearching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchSources, setResearchSources] = useState<string[] | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [removingNoteIndex, setRemovingNoteIndex] = useState<number | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      Promise.all([api.getCompany(id), api.getCompanyApplications(id)])
        .then(([c, apps]) => {
          setCompany(c);
          setForm(toForm(c));
          setApplications(apps);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const save = async () => {
    if (!id || !form) return;
    setSaving(true);
    try {
      const updated = await api.updateCompany(id, form);
      setCompany(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (company) setForm(toForm(company));
    setEditing(false);
    setResearchError(null);
    setResearchSources(null);
  };

  const autoFill = async () => {
    if (!id || !form) return;
    const searchName = form.name.trim();
    const searchCvr = form.cvr.trim();
    if (!searchName && !searchCvr) {
      setResearchError(t('company.researchErrorRequired'));
      return;
    }

    setResearching(true);
    setResearchError(null);
    setResearchSources(null);
    try {
      const result = await api.researchCompany(id, {
        name: searchName || undefined,
        cvr: searchCvr || undefined,
      });
      setForm(mergeResearch(form, result));
      if (result.sources?.length) setResearchSources(result.sources);
    } catch (err) {
      setResearchError(err instanceof Error ? err.message : t('company.researchErrorGeneric'));
    } finally {
      setResearching(false);
    }
  };

  const addNote = async () => {
    if (!id || !noteInput.trim()) return;
    setAddingNote(true);
    try {
      const updated = await api.addCompanyNote(id, noteInput.trim());
      setCompany(updated);
      setNoteInput('');
    } finally {
      setAddingNote(false);
    }
  };

  const removeNote = async (noteIndex: number) => {
    if (!id) return;
    setRemovingNoteIndex(noteIndex);
    try {
      const updated = await api.deleteCompanyNote(id, noteIndex);
      setCompany(updated);
    } finally {
      setRemovingNoteIndex(null);
    }
  };

  const confirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCompany(id);
      navigate('/companies');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('company.deleteDialog.error'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Skeleton variant="rounded" height={300} />;
  if (!company || !form) return <Typography>{t('company.notFound')}</Typography>;

  const linkedJobCount = applications.length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="h5" fontWeight={700}>{company.name}</Typography>
        {!editing && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              {t('company.edit')}
            </Button>
            <Button
              color="error"
              startIcon={<DeleteOutlineIcon />}
              onClick={() => {
                setDeleteError(null);
                setDeleteDialog(true);
              }}
              title={t('company.deleteTitle')}
            >
              {t('company.delete')}
            </Button>
          </Box>
        )}
      </Box>

      {saved && <Alert severity="success">{t('company.saved')}</Alert>}

      <Card>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{t('company.info')}</Typography>

          {editing ? (
            <>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Button
                  variant="outlined"
                  startIcon={researching ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                  onClick={autoFill}
                  disabled={researching || (!form.name.trim() && !form.cvr.trim())}
                >
                  {t('company.autoFill')}
                </Button>
              </Box>
              {researchError && <Alert severity="error">{researchError}</Alert>}
              {researchSources && (
                <Alert severity="info">
                  {t('company.researchSources', { sources: researchSources.join(', ') })}
                </Alert>
              )}
              <TextField
                label={t('company.fields.name')}
                fullWidth
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                label={t('company.fields.cvr')}
                fullWidth
                placeholder={t('company.fields.cvrPlaceholder')}
                value={form.cvr}
                onChange={(e) => setForm({ ...form, cvr: e.target.value })}
                helperText={t('company.fields.cvrHelp')}
              />
              <TextField
                label={t('company.fields.description')}
                fullWidth
                multiline
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <TextField
                label={t('company.fields.industry')}
                fullWidth
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              />
              <TextField
                label={t('company.fields.website')}
                fullWidth
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
              />
              <TextField
                label={t('company.fields.linkedIn')}
                fullWidth
                value={form.linkedIn}
                onChange={(e) => setForm({ ...form, linkedIn: e.target.value })}
              />
              <TextField
                label={t('company.fields.employeeCount')}
                fullWidth
                value={form.employeeCount}
                onChange={(e) => setForm({ ...form, employeeCount: e.target.value })}
              />
              <TextField
                label={t('company.fields.location')}
                fullWidth
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={save} disabled={saving || !form.name.trim()}>
                  {t('company.save')}
                </Button>
                <Button onClick={cancelEdit} disabled={saving}>
                  {t('company.cancel')}
                </Button>
              </Box>
            </>
          ) : (
            <>
              {company.cvr && (
                <Typography variant="body2" color="text.secondary">
                  {t('company.cvrDisplay', { cvr: company.cvr })}
                </Typography>
              )}
              {company.industry && <Chip label={company.industry} size="small" />}
              {company.description && (
                <Typography variant="body2" color="text.secondary">{company.description}</Typography>
              )}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {company.website && (
                  <Typography variant="body2">
                    <Link href={company.website} target="_blank" rel="noopener noreferrer">
                      {company.website}
                    </Link>
                  </Typography>
                )}
                {company.linkedIn && (
                  <Typography variant="body2">
                    <Link href={company.linkedIn} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </Link>
                  </Typography>
                )}
                {company.employeeCount && (
                  <Typography variant="body2" color="text.secondary">
                    {t('company.employees', { count: company.employeeCount })}
                  </Typography>
                )}
                {company.location && (
                  <Typography variant="body2" color="text.secondary">
                    {company.location}
                  </Typography>
                )}
              </Box>
              {!company.description && !company.website && !company.linkedIn && !company.employeeCount && !company.location && !company.industry && !company.cvr && (
                <Typography variant="body2" color="text.secondary">
                  {t('company.noInfoYet')}
                </Typography>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('company.notes.title')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('company.notes.firstContact', { date: formatDate(company.firstSeenAt) })} ·{' '}
            {t('company.notes.lastActivity', { date: formatDate(company.lastActivityAt) })}
          </Typography>

          {company.memory.interviewQuestions.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">{t('company.notes.interviewQuestions')}</Typography>
              <List dense>{company.memory.interviewQuestions.map((q) => <ListItem key={q} disablePadding><ListItemText primary={q} /></ListItem>)}</List>
            </>
          )}

          {company.memory.contacts.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2">{t('company.notes.contacts')}</Typography>
              <List dense>
                {company.memory.contacts.map((c) => (
                  <ListItem key={c.name} disablePadding>
                    <ListItemText primary={c.name} secondary={c.role} />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          <Divider sx={{ my: 2 }} />
          {company.memory.generalNotes.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
              {company.memory.generalNotes.map((n, i) => (
                <Box
                  key={`${i}-${n.slice(0, 24)}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'pre-wrap', pt: 0.5 }}>
                    {n}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label={t('company.notes.removeAria')}
                    onClick={() => removeNote(i)}
                    disabled={removingNoteIndex === i}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('company.notes.placeholder')}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <Button onClick={addNote} disabled={addingNote || !noteInput.trim()}>
              {t('company.notes.add')}
            </Button>
          </Box>

        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            {t('company.jobs.title', { count: applications.length })}
          </Typography>
          {applications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('company.jobs.empty')}
            </Typography>
          ) : (
            applications.map((app) => (
              <Card key={app._id} sx={{ mb: 1.5, mt: 1.5 }}>
                <CardActionArea onClick={() => navigate(`/applications/${app._id}`)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>{app.job.title}</Typography>
                        {app.job.location && (
                          <Typography variant="body2" color="text.secondary">{app.job.location}</Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WishlistButton isWishlisted={!!app.isWishlisted} />
                        <StatusBadge status={app.status} />
                      </Box>
                    </Box>
                    {app.job.summary && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                        {app.job.summary.slice(0, 100)}...
                      </Typography>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialog} onClose={() => !deleting && setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('company.deleteDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('company.deleteDialog.confirm', { name: company.name })}
          </Typography>
          {linkedJobCount > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {t(
                linkedJobCount === 1
                  ? 'company.deleteDialog.linkedSingular'
                  : 'company.deleteDialog.linkedPlural',
                { count: linkedJobCount }
              )}
            </Alert>
          )}
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleting}>{t('company.deleteDialog.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmDelete}
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={16} /> : t('company.deleteDialog.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
