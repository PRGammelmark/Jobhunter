import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Link,
  IconButton,
  Menu,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import WishlistButton from '../components/pipeline/WishlistButton';
import MatchScoreBars from '../components/analysis/MatchScoreBars';
import {
  type Application,
  type ApplicationStatus,
  type ApplicationTemplate,
  type Company,
  type CvTemplate,
  type DocumentSet,
  type InterviewContext,
  type InterviewRound,
  type InterviewType,
  type InterviewFormat,
} from '@career-intelligence/shared';

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [documents, setDocuments] = useState<DocumentSet[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [note, setNote] = useState('');
  const [answer, setAnswer] = useState('');
  const [saveToKnowledge, setSaveToKnowledge] = useState(true);
  const [answerSaved, setAnswerSaved] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [emailDialog, setEmailDialog] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', body: '' });
  const [emailError, setEmailError] = useState('');
  const [interviewContext, setInterviewContext] = useState<InterviewContext>({
    round: 'first',
    type: 'general',
    format: 'online',
  });
  const [generateDialog, setGenerateDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentSet | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [cvTemplates, setCvTemplates] = useState<CvTemplate[]>([]);
  const [appTemplates, setAppTemplates] = useState<ApplicationTemplate[]>([]);
  const [selectedCvTemplateId, setSelectedCvTemplateId] = useState('');
  const [selectedAppTemplateId, setSelectedAppTemplateId] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [reviseDocId, setReviseDocId] = useState<string | null>(null);
  const [reviseInstruction, setReviseInstruction] = useState('');
  const [docActionError, setDocActionError] = useState('');

  const load = async () => {
    if (!id) return;
    const [application, docs] = await Promise.all([
      api.getApplication(id),
      api.getDocuments(id),
    ]);
    setApp(application);
    setDocuments(docs);
    if (application.companyId) {
      const c = await api.getCompany(application.companyId);
      setCompany(c);
    } else {
      setCompany(null);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  if (loading || !app) {
    return <CircularProgress />;
  }

  const analysis = app.aiAnalysis;

  const runAnalyze = async () => {
    setActionLoading('analyze');
    try {
      const updated = await api.analyzeApplication(app._id);
      setApp(updated);
      setTab(2);
    } finally {
      setActionLoading('');
    }
  };

  const runGenerate = async () => {
    setActionLoading('generate');
    try {
      const result = await api.generateDocuments(app._id, {
        cvTemplateId: selectedCvTemplateId || undefined,
        applicationTemplateId: selectedAppTemplateId || undefined,
      });
      setApp(result.application);
      setDocuments(await api.getDocuments(app._id));
      setGenerateDialog(false);
      setTab(3);
    } finally {
      setActionLoading('');
    }
  };

  const openGenerateDialog = async () => {
    const [cvs, apps] = await Promise.all([api.getCvTemplates(), api.getApplicationTemplates()]);
    setCvTemplates(cvs);
    setAppTemplates(apps);
    const defaultCv = cvs.find((c) => c.isDefault);
    const defaultApp = apps.find((a) => a.isDefault);
    setSelectedCvTemplateId(defaultCv?._id || '');
    setSelectedAppTemplateId(defaultApp?._id || '');
    setGenerateDialog(true);
  };

  const toggleWishlist = async () => {
    const next = !app.isWishlisted;
    setApp({ ...app, isWishlisted: next });
    try {
      const updated = await api.updateApplicationWishlist(app._id, next);
      setApp(updated);
    } catch {
      setApp({ ...app, isWishlisted: app.isWishlisted });
    }
  };

  const changeStatus = async (status: ApplicationStatus) => {
    if (status === 'interview') {
      setInterviewDialog(true);
      return;
    }
    const updated = await api.updateApplicationStatus(app._id, status);
    setApp(updated);
  };

  const submitInterviewPrep = async () => {
    setInterviewDialog(false);
    setActionLoading('interview');
    try {
      const result = await api.interviewPrep(app._id, interviewContext);
      const updated = await api.updateApplicationStatus(app._id, 'interview');
      setApp({ ...result.application, status: updated.status, statusHistory: updated.statusHistory });
      setTab(4);
    } finally {
      setActionLoading('');
    }
  };

  const submitAnswer = async () => {
    if (!selectedQuestion || !answer) return;
    const question = selectedQuestion;
    const updated = await api.answerQuestions(app._id, [
      { question, answer, saveToKnowledge },
    ]);
    setApp(updated);
    setAnswer('');
    setSelectedQuestion('');
    if (saveToKnowledge) {
      const saved = updated.aiAnalysis?.aiQuestions.find(
        (q) => q.question === question && q.knowledgeEntryId
      );
      setAnswerSaved(saved?.knowledgeEntryId || 'saved');
      setTimeout(() => setAnswerSaved(''), 4000);
    }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    const updated = await api.addNote(app._id, note);
    setApp(updated);
    setNote('');
  };

  const runExportPdf = async (documentSetId?: string) => {
    setActionLoading('pdf');
    try {
      const result = await api.exportPdf(app._id, documentSetId);
      setDocuments(await api.getDocuments(app._id));
      return result;
    } finally {
      setActionLoading('');
    }
  };

  const displayCompanyName = company?.name || app.job.companyName;

  const openEmailDialog = () => {
    setEmailForm({
      to: app.job.contactEmail || app.emailDraft?.to || '',
      subject: app.emailDraft?.subject || `Ansøgning: ${app.job.title} — ${displayCompanyName}`,
      body:
        app.emailDraft?.body ||
        `Kære ${displayCompanyName},\n\nJeg søger hermed stillingen som ${app.job.title}.\n\nVedhæftet finder du mit CV og min ansøgning.\n\nMed venlig hilsen`,
    });
    setEmailError('');
    setEmailDialog(true);
  };

  const submitEmail = async () => {
    setActionLoading('email');
    setEmailError('');
    try {
      const docId = app.activeDocumentSetId || documents[0]?._id;
      if (docId) {
        await api.exportPdf(app._id, docId);
        setDocuments(await api.getDocuments(app._id));
      }
      const result = await api.sendEmail(app._id, { ...emailForm, documentSetId: docId });
      setApp(result.application);
      setEmailDialog(false);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : 'Kunne ikke sende email');
    } finally {
      setActionLoading('');
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteApplication(app._id);
      navigate('/pipeline');
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteDocument = async () => {
    if (!documentToDelete) return;
    setDeletingDocument(true);
    try {
      const result = await api.deleteDocument(app._id, documentToDelete._id);
      setApp(result.application);
      setDocuments(await api.getDocuments(app._id));
      setDocumentToDelete(null);
      if (editingDocId === documentToDelete._id) {
        setEditingDocId(null);
        setEditDraft('');
      }
      if (reviseDocId === documentToDelete._id) {
        setReviseDocId(null);
        setReviseInstruction('');
      }
    } finally {
      setDeletingDocument(false);
    }
  };

  const startEditDocument = (doc: DocumentSet) => {
    setDocActionError('');
    setReviseDocId(null);
    setReviseInstruction('');
    setEditingDocId(doc._id);
    setEditDraft(doc.coverLetter.content);
  };

  const cancelEditDocument = () => {
    setEditingDocId(null);
    setEditDraft('');
    setDocActionError('');
  };

  const saveEditedDocument = async (doc: DocumentSet) => {
    if (!editDraft.trim()) {
      setDocActionError('Ansøgningstekst må ikke være tom');
      return;
    }
    setActionLoading('save-doc');
    setDocActionError('');
    try {
      const result = await api.saveDocument(app._id, {
        coverLetter: { content: editDraft.trim() },
        basedOnDocumentSetId: doc._id,
      });
      setApp(result.application);
      setDocuments(await api.getDocuments(app._id));
      setEditingDocId(null);
      setEditDraft('');
    } catch (e) {
      setDocActionError(e instanceof Error ? e.message : 'Kunne ikke gemme ansøgning');
    } finally {
      setActionLoading('');
    }
  };

  const startReviseDocument = (doc: DocumentSet) => {
    setDocActionError('');
    setEditingDocId(null);
    setEditDraft('');
    setReviseDocId(doc._id);
    setReviseInstruction('');
  };

  const cancelReviseDocument = () => {
    setReviseDocId(null);
    setReviseInstruction('');
    setDocActionError('');
  };

  const runReviseDocument = async (doc: DocumentSet) => {
    if (!reviseInstruction.trim()) {
      setDocActionError('Angiv ønskede opdateringer');
      return;
    }
    setActionLoading('revise');
    setDocActionError('');
    try {
      const result = await api.reviseDocuments(app._id, {
        instruction: reviseInstruction.trim(),
        documentSetId: doc._id,
      });
      setApp(result.application);
      setDocuments(await api.getDocuments(app._id));
      setReviseDocId(null);
      setReviseInstruction('');
    } catch (e) {
      setDocActionError(e instanceof Error ? e.message : 'Kunne ikke opdatere ansøgning');
    } finally {
      setActionLoading('');
    }
  };

  const hasAnalysis = !!analysis;
  const hasApplication = documents.length > 0;
  const showGenerateButton = !hasApplication && !app.hideGenerateCoverLetter;
  const canDeleteDocuments =
    !app.sentAt && !['sent', 'interview', 'rejected', 'offer', 'hired'].includes(app.status);

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StatusBadge status={app.status} onChange={changeStatus} />
            <WishlistButton isWishlisted={!!app.isWishlisted} onToggle={toggleWishlist} />
          </Box>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>{app.job.title}</Typography>
          <Typography
            variant="body1"
            color="primary"
            sx={{ cursor: app.companyId ? 'pointer' : 'default' }}
            onClick={() => app.companyId && navigate(`/companies/${app.companyId}`)}
          >
            {displayCompanyName}
          </Typography>
        </Box>
        <IconButton
          size="small"
          aria-label="Flere handlinger"
          onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
          disabled={!!actionLoading || deleting}
        >
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={moreMenuAnchor}
          open={Boolean(moreMenuAnchor)}
          onClose={() => setMoreMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              setMoreMenuAnchor(null);
              setDeleteDialog(true);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DeleteOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Slet</ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {(!hasAnalysis || !analysis?.matchAssessment) && (
          <Button
            variant="contained"
            size="small"
            startIcon={actionLoading === 'analyze' ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
            onClick={runAnalyze}
            disabled={!!actionLoading}
          >
            {hasAnalysis ? 'Opdatér analyse' : 'Analysér'}
          </Button>
        )}
        {hasApplication ? (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setTab(3)}
            disabled={!!actionLoading}
          >
            Se ansøgning
          </Button>
        ) : showGenerateButton ? (
          <Button
            variant="outlined"
            size="small"
            onClick={openGenerateDialog}
            disabled={!!actionLoading}
          >
            Generér ansøgning
          </Button>
        ) : null}
        {hasApplication && (
          <Button
            variant="outlined"
            size="small"
            startIcon={actionLoading === 'pdf' ? <CircularProgress size={16} /> : <PictureAsPdfIcon />}
            onClick={() => runExportPdf(app.activeDocumentSetId || documents[0]?._id)}
            disabled={!!actionLoading}
          >
            Export PDF
          </Button>
        )}
        {hasApplication && (
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={actionLoading === 'email' ? <CircularProgress size={16} /> : <SendIcon />}
            onClick={openEmailDialog}
            disabled={!!actionLoading}
          >
            Send ansøgning
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label="Stilling" />
        <Tab label="Virksomhed" />
        <Tab label="Analyse" />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Ansøgning
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: hasApplication ? 'success.main' : 'action.disabled',
                  flexShrink: 0,
                }}
                aria-label={hasApplication ? 'Ansøgning findes' : 'Ingen ansøgning'}
              />
            </Box>
          }
        />
        <Tab label="Interview" />
        <Tab label="Noter" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {analysis?.matchAssessment ? (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Match-vurdering</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {analysis.matchAssessment}
                </Typography>
              </CardContent>
            </Card>
          ) : !hasAnalysis ? (
            <Alert severity="info">
              Match-vurdering kommer, når AI-analysen er kørt.
            </Alert>
          ) : null}
          <Card>
            <CardContent>
              {app.job.location && <Typography variant="body2" color="text.secondary">📍 {app.job.location}</Typography>}
              {app.job.url && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <a href={app.job.url} target="_blank" rel="noreferrer">Åbn original opslag</a>
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {app.job.rawText || app.job.summary || 'Intet indhold endnu'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!company ? (
            <Alert severity="info">Ingen virksomhed knyttet til dette stillingsopslag.</Alert>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Virksomhedsinfo</Typography>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{company.name}</Typography>
                {company.industry && <Chip label={company.industry} size="small" sx={{ mb: 1 }} />}
                {company.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {company.description}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                  {company.website ? (
                    <Link href={company.website} target="_blank" rel="noopener noreferrer" variant="body2">
                      Virksomhedsside
                    </Link>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Ingen virksomhedsside registreret
                    </Typography>
                  )}
                  {company.linkedIn && (
                    <Link href={company.linkedIn} target="_blank" rel="noopener noreferrer" variant="body2">
                      LinkedIn
                    </Link>
                  )}
                  {company.employeeCount && (
                    <Typography variant="body2" color="text.secondary">{company.employeeCount} ansatte</Typography>
                  )}
                  {company.location && (
                    <Typography variant="body2" color="text.secondary">{company.location}</Typography>
                  )}
                </Box>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/companies/${company._id}`)}>
                  Rediger virksomhedsinfo
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!analysis ? (
            <Alert severity="info">Kør AI-analyse for at se match-scores og sparringspartner-feedback.</Alert>
          ) : (
            <>
              <Card><CardContent><MatchScoreBars scores={analysis.matchScores} /></CardContent></Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Styrker</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis.strengths.map((s) => <Chip key={s} label={s} color="success" size="small" variant="outlined" />)}
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Risici</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis.risks.map((r) => <Chip key={r} label={r} color="warning" size="small" variant="outlined" />)}
                  </Box>
                </CardContent>
              </Card>

              {analysis.suggestedStories.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Historier at bruge</Typography>
                    <List dense>
                      {analysis.suggestedStories.map((s) => (
                        <ListItem key={s.knowledgeEntryId} disablePadding>
                          <ListItemText primary={s.title} secondary={s.reason} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              )}

              {analysis.aiQuestions.filter((q) => !q.answered).length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Spørgsmål fra AI</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Vælg spørgsmål</InputLabel>
                      <Select value={selectedQuestion} label="Vælg spørgsmål" onChange={(e) => setSelectedQuestion(e.target.value)}>
                        {analysis.aiQuestions.filter((q) => !q.answered).map((q) => (
                          <MenuItem key={q.question} value={q.question}>{q.question}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField fullWidth multiline rows={3} label="Dit svar" value={answer} onChange={(e) => setAnswer(e.target.value)} sx={{ mb: 1 }} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={saveToKnowledge}
                          onChange={(e) => setSaveToKnowledge(e.target.checked)}
                        />
                      }
                      label="Gem opsummering i Knowledge Base"
                      sx={{ mb: 1 }}
                    />
                    {answerSaved && (
                      <Alert severity="success" sx={{ mb: 1 }}>
                        {answerSaved === 'saved'
                          ? 'Svar gemt på stillingsopslaget.'
                          : (
                            <>
                              Gemt i Knowledge Base.{' '}
                              <Button size="small" onClick={() => navigate(`/knowledge/${answerSaved}`)}>
                                Se entry
                              </Button>
                            </>
                          )}
                      </Alert>
                    )}
                    <Button variant="contained" onClick={submitAnswer} disabled={!selectedQuestion || !answer}>Gem svar</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {documents.length === 0 ? (
            <Alert severity="info">
              {showGenerateButton
                ? 'Ingen ansøgning endnu. Klik "Generér ansøgning".'
                : 'Ansøgningen genereres automatisk ved oprettelse. Hvis den mangler, prøv at oprette stillingen igen.'}
            </Alert>
          ) : (
            <>
              {docActionError && <Alert severity="error" onClose={() => setDocActionError('')}>{docActionError}</Alert>}
              {documents.map((doc) => {
                const isEditing = editingDocId === doc._id;
                const isRevising = reviseDocId === doc._id;
                const isActive = app.activeDocumentSetId === doc._id;
                return (
                  <Card key={doc._id} variant={isActive ? 'outlined' : undefined} sx={isActive ? { borderColor: 'primary.main' } : undefined}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          Version {doc.version}{doc.label && doc.label !== `Version ${doc.version}` ? ` — ${doc.label}` : ''}
                        </Typography>
                        {isActive && <Chip label="Aktiv" size="small" color="primary" variant="outlined" />}
                        {doc.source === 'manual_edit' && <Chip label="Manuel" size="small" variant="outlined" />}
                        {doc.source === 'ai_generated' && <Chip label="AI" size="small" variant="outlined" />}
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>Ansøgning</Typography>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          multiline
                          minRows={12}
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          disabled={actionLoading === 'save-doc'}
                          sx={{ mb: 2 }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
                          {doc.coverLetter.content}
                        </Typography>
                      )}
                      {isRevising && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Opdatér med AI
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Beskriv hvad der skal ændres — fx tone, fokusis på bestemte erfaringer, eller kortere introduktion.
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="Fx: Gør introen kortere og nævn mere eksplicit mit arbejde med TypeScript hos Acme."
                            value={reviseInstruction}
                            onChange={(e) => setReviseInstruction(e.target.value)}
                            disabled={actionLoading === 'revise'}
                            sx={{ mb: 1.5 }}
                          />
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={actionLoading === 'revise' ? <CircularProgress size={16} /> : <AutoAwesomeIcon />}
                              onClick={() => runReviseDocument(doc)}
                              disabled={!!actionLoading || !reviseInstruction.trim()}
                            >
                              Opdatér
                            </Button>
                            <Button size="small" onClick={cancelReviseDocument} disabled={actionLoading === 'revise'}>
                              Annuller
                            </Button>
                          </Box>
                        </Box>
                      )}
                      {doc.aiPromptSnapshot && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="caption" component="div" color="text.secondary">AI-instruktion</Typography>
                          {doc.aiPromptSnapshot}
                        </Alert>
                      )}
                      {doc.cv.content?.trim() && (
                        <>
                          <Typography variant="subtitle2">CV</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>{doc.cv.content}</Typography>
                        </>
                      )}
                      {doc.potentialImprovements && doc.potentialImprovements.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="secondary">Potential improvements</Typography>
                          <List dense>
                            {doc.potentialImprovements.map((imp) => (
                              <ListItem key={imp} disablePadding><ListItemText primary={`• ${imp}`} /></ListItem>
                            ))}
                          </List>
                        </>
                      )}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                        {isEditing ? (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => saveEditedDocument(doc)}
                              disabled={!!actionLoading || !editDraft.trim()}
                              startIcon={actionLoading === 'save-doc' ? <CircularProgress size={16} /> : undefined}
                            >
                              Gem som ny version
                            </Button>
                            <Button size="small" onClick={cancelEditDocument} disabled={actionLoading === 'save-doc'}>
                              Annuller
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => startEditDocument(doc)}
                              disabled={!!actionLoading || isRevising}
                            >
                              Rediger
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AutoAwesomeIcon />}
                              onClick={() => startReviseDocument(doc)}
                              disabled={!!actionLoading || isEditing}
                            >
                              Opdatér med AI
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => runExportPdf(doc._id)} disabled={!!actionLoading}>
                              Generér PDF
                            </Button>
                            {doc.cv.pdfFile && (
                              <Button size="small" href={`/api/files/${encodeURIComponent(doc.cv.pdfFile.storageKey)}`} target="_blank">
                                Download CV
                              </Button>
                            )}
                            {doc.coverLetter.pdfFile && (
                              <Button size="small" href={`/api/files/${encodeURIComponent(doc.coverLetter.pdfFile.storageKey)}`} target="_blank">
                                Download ansøgning
                              </Button>
                            )}
                            {canDeleteDocuments && (
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={<DeleteOutlineIcon />}
                                onClick={() => setDocumentToDelete(doc)}
                                disabled={deletingDocument || !!actionLoading}
                              >
                                Slet ansøgning
                              </Button>
                            )}
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </Box>
      )}

      {tab === 4 && (
        <Box>
          {!app.interviewPrep ? (
            <Alert severity="info" action={
              <Button color="inherit" size="small" onClick={() => setInterviewDialog(true)}>Start prep</Button>
            }>
              Skift status til Samtale for at generere interview-forberedelse.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {company?.description && (
                <Card><CardContent>
                  <Typography variant="subtitle2">Virksomhedsinfo</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{company.description}</Typography>
                </CardContent></Card>
              )}
              <Card><CardContent>
                <Typography variant="subtitle2">Virksomhedsresearch</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{app.interviewPrep.companyResearch}</Typography>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">Elevator pitch</Typography>
                <Typography variant="body2">{app.interviewPrep.elevatorPitch}</Typography>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">Spørgsmål du bør stille</Typography>
                <List dense>{app.interviewPrep.questionsToAsk.map((q) => <ListItem key={q} disablePadding><ListItemText primary={q} /></ListItem>)}</List>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">Sandsynlige spørgsmål</Typography>
                <List dense>{app.interviewPrep.likelyQuestions.map((q) => <ListItem key={q} disablePadding><ListItemText primary={q} /></ListItem>)}</List>
              </CardContent></Card>
            </Box>
          )}
        </Box>
      )}

      {tab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField fullWidth size="small" placeholder="Tilføj note..." value={note} onChange={(e) => setNote(e.target.value)} />
            <Button variant="contained" onClick={addNote}>Tilføj</Button>
          </Box>
          <List>
            {app.notes.map((n) => (
              <ListItem key={n._id} alignItems="flex-start">
                <ListItemText primary={n.text} secondary={new Date(n.createdAt).toLocaleString('da-DK')} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Dialog open={generateDialog} onClose={() => !actionLoading && setGenerateDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Generér ansøgning</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Vælg hvilke skabeloner AI skal tage udgangspunkt i. Lad feltet være tomt for automatisk valg.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>CV-skabelon</InputLabel>
            <Select
              value={selectedCvTemplateId}
              label="CV-skabelon"
              onChange={(e) => setSelectedCvTemplateId(e.target.value)}
            >
              <MenuItem value="">Automatisk valg</MenuItem>
              {cvTemplates.map((cv) => (
                <MenuItem key={cv._id} value={cv._id}>
                  {cv.name}{cv.isDefault ? ' (default)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Ansøgningsskabelon</InputLabel>
            <Select
              value={selectedAppTemplateId}
              label="Ansøgningsskabelon"
              onChange={(e) => setSelectedAppTemplateId(e.target.value)}
            >
              <MenuItem value="">Ingen skabelon</MenuItem>
              {appTemplates.map((t) => (
                <MenuItem key={t._id} value={t._id}>
                  {t.name}{t.isDefault ? ' (default)' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {cvTemplates.length === 0 && appTemplates.length === 0 && (
            <Alert severity="info">
              Du har ingen skabeloner endnu. Gå til CV &amp; templates for at uploade eller oprette dem.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)} disabled={actionLoading === 'generate'}>
            Annuller
          </Button>
          <Button
            variant="contained"
            onClick={runGenerate}
            disabled={actionLoading === 'generate'}
            startIcon={actionLoading === 'generate' ? <CircularProgress size={16} /> : undefined}
          >
            Generér
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={emailDialog} onClose={() => setEmailDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send ansøgning</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {emailError && <Alert severity="error">{emailError}</Alert>}
          <TextField label="Til" fullWidth value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} />
          <TextField label="Emne" fullWidth value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} />
          <TextField label="Besked" fullWidth multiline rows={8} value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} />
          <Typography variant="caption" color="text.secondary">
            CV og ansøgning vedhæftes automatisk som PDF. Kræver forbundet Gmail/Outlook i Indstillinger.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialog(false)}>Annuller</Button>
          <Button variant="contained" onClick={submitEmail} disabled={!!actionLoading || !emailForm.to}>
            Send
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => !deleting && setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Slet stillingsopslag?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Er du sikker på, at du vil slette <strong>{app.job.title}</strong>
            {displayCompanyName ? <> hos <strong>{displayCompanyName}</strong></> : null}? Dette kan ikke fortrydes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleting}>Annuller</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : 'Slet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!documentToDelete}
        onClose={() => !deletingDocument && setDocumentToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Slet ansøgning?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Er du sikker på, at du vil slette{' '}
            <strong>
              Version {documentToDelete?.version}
              {documentToDelete?.label ? ` — ${documentToDelete.label}` : ''}
            </strong>
            ? Dette kan ikke fortrydes.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentToDelete(null)} disabled={deletingDocument}>Annuller</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteDocument} disabled={deletingDocument}>
            {deletingDocument ? <CircularProgress size={16} /> : 'Slet'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={interviewDialog} onClose={() => setInterviewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Hvilken samtale er det?</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Runde</Typography>
          <RadioGroup value={interviewContext.round} onChange={(e) => setInterviewContext({ ...interviewContext, round: e.target.value as InterviewRound })}>
            <FormControlLabel value="first" control={<Radio />} label="Første samtale" />
            <FormControlLabel value="second" control={<Radio />} label="Anden samtale" />
            <FormControlLabel value="third" control={<Radio />} label="Tredje samtale" />
            <FormControlLabel value="final" control={<Radio />} label="Finale" />
          </RadioGroup>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Type</Typography>
          <RadioGroup value={interviewContext.type} onChange={(e) => setInterviewContext({ ...interviewContext, type: e.target.value as InterviewType })}>
            <FormControlLabel value="general" control={<Radio />} label="Generel" />
            <FormControlLabel value="technical" control={<Radio />} label="Teknisk interview" />
            <FormControlLabel value="case" control={<Radio />} label="Case" />
            <FormControlLabel value="hr" control={<Radio />} label="HR / kultur" />
          </RadioGroup>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>Format</Typography>
          <RadioGroup value={interviewContext.format} onChange={(e) => setInterviewContext({ ...interviewContext, format: e.target.value as InterviewFormat })}>
            <FormControlLabel value="online" control={<Radio />} label="Online" />
            <FormControlLabel value="physical" control={<Radio />} label="Fysisk" />
            <FormControlLabel value="hybrid" control={<Radio />} label="Hybrid" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterviewDialog(false)}>Annuller</Button>
          <Button variant="contained" onClick={submitInterviewPrep} disabled={actionLoading === 'interview'}>
            Generér interview-prep
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
