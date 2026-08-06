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
import { FormattedJobText } from '../components/FormattedJobText';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import WishlistButton from '../components/pipeline/WishlistButton';
import PageBreadcrumbs from '../components/layout/PageBreadcrumbs';
import { PageHeader } from '../ui';
import {
  type Application,
  type ApplicationStatus,
  type ApplicationTemplate,
  type Company,
  type CvTemplate,
  type DocumentSet,
  type Recommendation,
  type InterviewContext,
  type InterviewRound,
  type InterviewType,
  type InterviewFormat,
} from '@career-intelligence/shared';
import { useLocale } from '../i18n';

export default function ApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, formatDateTime } = useLocale();
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendationIds, setSelectedRecommendationIds] = useState<string[]>([]);
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

  const openEmailDialog = async () => {
    setEmailForm({
      to: app.job.contactEmail || app.emailDraft?.to || '',
      subject: app.emailDraft?.subject || t('application.emailDraft.subject', { title: app.job.title, company: displayCompanyName }),
      body:
        app.emailDraft?.body ||
        t('application.emailDraft.body', { title: app.job.title, company: displayCompanyName }),
    });
    setSelectedRecommendationIds([]);
    setEmailError('');
    setEmailDialog(true);
    try {
      const recs = await api.getRecommendations();
      setRecommendations(recs);
    } catch {
      setRecommendations([]);
    }
  };

  const toggleRecommendation = (id: string) => {
    setSelectedRecommendationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
      const result = await api.sendEmail(app._id, {
        ...emailForm,
        documentSetId: docId,
        recommendationIds: selectedRecommendationIds,
      });
      setApp(result.application);
      setEmailDialog(false);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : t('application.emailDialog.errorSend'));
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
      setDocActionError(t('application.documents.errorEmptyCoverLetter'));
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
      setDocActionError(e instanceof Error ? e.message : t('application.documents.errorSave'));
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
      setDocActionError(t('application.documents.errorReviseInstruction'));
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
      setDocActionError(e instanceof Error ? e.message : t('application.documents.errorRevise'));
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
    <Box sx={{ maxWidth: '100%', minWidth: 0, overflowX: 'clip' }}>
      <PageBreadcrumbs
        items={[
          { label: t('nav.pipeline'), to: '/pipeline' },
          ...(displayCompanyName
            ? [{
                label: displayCompanyName,
                to: app.companyId ? `/companies/${app.companyId}` : undefined,
              }]
            : []),
          { label: app.job.title },
        ]}
      />
      <PageHeader
        title={app.job.title}
        subtitle={displayCompanyName || undefined}
        action={
          <IconButton
            size="small"
            aria-label={t('application.actions.moreAria')}
            onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
            disabled={!!actionLoading || deleting}
          >
            <MoreVertIcon />
          </IconButton>
        }
      />
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <StatusBadge status={app.status} onChange={changeStatus} />
        <WishlistButton isWishlisted={!!app.isWishlisted} onToggle={toggleWishlist} />
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
            <ListItemText>{t('application.actions.delete')}</ListItemText>
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
            {hasAnalysis ? t('application.actions.updateAnalysis') : t('application.actions.analyze')}
          </Button>
        )}
        {hasApplication ? (
          <Button
            variant="outlined"
            size="small"
            onClick={() => setTab(3)}
            disabled={!!actionLoading}
          >
            {t('application.actions.viewApplication')}
          </Button>
        ) : showGenerateButton ? (
          <Button
            variant="outlined"
            size="small"
            onClick={openGenerateDialog}
            disabled={!!actionLoading}
          >
            {t('application.actions.generateApplication')}
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
            {t('application.actions.exportPdf')}
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
            {t('application.actions.sendApplication')}
          </Button>
        )}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2, maxWidth: '100%', minWidth: 0 }}
      >
        <Tab label={t('application.tabs.job')} />
        <Tab label={t('application.tabs.company')} />
        <Tab label={t('application.tabs.analysis')} />
        <Tab
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('application.tabs.application')}
              <Box
                component="span"
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: hasApplication ? 'success.main' : 'action.disabled',
                  flexShrink: 0,
                }}
                aria-label={hasApplication ? t('application.tabs.applicationExistsAria') : t('application.tabs.applicationMissingAria')}
              />
            </Box>
          }
        />
        <Tab label={t('application.tabs.interview')} />
        <Tab label={t('application.tabs.notes')} />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {analysis?.matchAssessment ? (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>{t('application.job.matchAssessment')}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>
                  {analysis.matchAssessment}
                </Typography>
              </CardContent>
            </Card>
          ) : !hasAnalysis ? (
            <Alert severity="info">
              {t('application.job.matchAssessmentPending')}
            </Alert>
          ) : null}
          <Card>
            <CardContent>
              {app.job.location && <Typography variant="body2" color="text.secondary">📍 {app.job.location}</Typography>}
              {app.job.url && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  <a href={app.job.url} target="_blank" rel="noreferrer">{t('application.job.openOriginal')}</a>
                </Typography>
              )}
              <Divider sx={{ my: 2 }} />
              <FormattedJobText text={app.job.rawText || app.job.summary || ''} />
            </CardContent>
          </Card>
        </Box>
      )}

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!company ? (
            <Alert severity="info">{t('application.company.noneLinked')}</Alert>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>{t('application.company.info')}</Typography>
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
                      {t('application.company.website')}
                    </Link>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {t('application.company.noWebsite')}
                    </Typography>
                  )}
                  {company.linkedIn && (
                    <Link href={company.linkedIn} target="_blank" rel="noopener noreferrer" variant="body2">
                      {t('application.company.linkedIn')}
                    </Link>
                  )}
                  {company.employeeCount && (
                    <Typography variant="body2" color="text.secondary">{t('application.company.employees', { count: company.employeeCount })}</Typography>
                  )}
                  {company.location && (
                    <Typography variant="body2" color="text.secondary">{company.location}</Typography>
                  )}
                </Box>
                <Button size="small" sx={{ mt: 1 }} onClick={() => navigate(`/companies/${company._id}`)}>
                  {t('application.company.editInfo')}
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {!analysis ? (
            <Alert severity="info">{t('application.analysis.runPrompt')}</Alert>
          ) : (
            <>
              {analysis.matchAssessment && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>{t('application.analysis.matchAssessment')}</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>
                      {analysis.matchAssessment}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>{t('application.analysis.strengths')}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis.strengths.map((s) => <Chip key={s} label={s} color="success" size="small" variant="outlined" />)}
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>{t('application.analysis.risks')}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {analysis.risks.map((r) => <Chip key={r} label={r} color="warning" size="small" variant="outlined" />)}
                  </Box>
                </CardContent>
              </Card>

              {analysis.suggestedStories.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>{t('application.analysis.storiesToUse')}</Typography>
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
                    <Typography variant="subtitle2" gutterBottom>{t('application.analysis.aiQuestions')}</Typography>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>{t('application.analysis.selectQuestion')}</InputLabel>
                      <Select value={selectedQuestion} label={t('application.analysis.selectQuestion')} onChange={(e) => setSelectedQuestion(e.target.value)}>
                        {analysis.aiQuestions.filter((q) => !q.answered).map((q) => (
                          <MenuItem key={q.question} value={q.question}>{q.question}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField fullWidth multiline rows={3} label={t('application.analysis.yourAnswer')} value={answer} onChange={(e) => setAnswer(e.target.value)} sx={{ mb: 1 }} />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={saveToKnowledge}
                          onChange={(e) => setSaveToKnowledge(e.target.checked)}
                        />
                      }
                      label={t('application.analysis.saveToKnowledge')}
                      sx={{ mb: 1 }}
                    />
                    {answerSaved && (
                      <Alert severity="success" sx={{ mb: 1 }}>
                        {answerSaved === 'saved'
                          ? t('application.analysis.answerSavedOnJob')
                          : (
                            <>
                              {t('application.analysis.savedToKnowledge')}{' '}
                              <Button size="small" onClick={() => navigate(`/knowledge/${answerSaved}`)}>
                                {t('application.analysis.viewEntry')}
                              </Button>
                            </>
                          )}
                      </Alert>
                    )}
                    <Button variant="contained" onClick={submitAnswer} disabled={!selectedQuestion || !answer}>{t('application.analysis.saveAnswer')}</Button>
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
                ? t('application.documents.emptyGenerate')
                : t('application.documents.emptyAuto')}
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
                          {doc.label && doc.label !== t('common.version', { version: doc.version })
                            ? t('application.documents.versionWithLabel', { version: doc.version, label: doc.label })
                            : t('common.version', { version: doc.version })}
                        </Typography>
                        {isActive && <Chip label={t('application.documents.active')} size="small" color="primary" variant="outlined" />}
                        {doc.source === 'manual_edit' && <Chip label={t('application.documents.sourceManual')} size="small" variant="outlined" />}
                        {doc.source === 'ai_generated' && <Chip label={t('application.documents.sourceAi')} size="small" variant="outlined" />}
                      </Box>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>{t('application.documents.coverLetter')}</Typography>
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
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 2 }}>
                          {doc.coverLetter.content}
                        </Typography>
                      )}
                      {isRevising && (
                        <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {t('application.documents.reviseWithAi')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {t('application.documents.reviseHelp')}
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder={t('application.documents.revisePlaceholder')}
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
                              {t('application.documents.update')}
                            </Button>
                            <Button size="small" onClick={cancelReviseDocument} disabled={actionLoading === 'revise'}>
                              {t('application.documents.cancel')}
                            </Button>
                          </Box>
                        </Box>
                      )}
                      {doc.aiPromptSnapshot && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                          <Typography variant="caption" component="div" color="text.secondary">{t('application.documents.aiInstruction')}</Typography>
                          {doc.aiPromptSnapshot}
                        </Alert>
                      )}
                      {doc.cv.content?.trim() && (
                        <>
                          <Typography variant="subtitle2">{t('application.documents.cv')}</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', mb: 2 }}>{doc.cv.content}</Typography>
                        </>
                      )}
                      {doc.potentialImprovements && doc.potentialImprovements.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="secondary">{t('application.documents.potentialImprovements')}</Typography>
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
                              {t('application.documents.saveAsNewVersion')}
                            </Button>
                            <Button size="small" onClick={cancelEditDocument} disabled={actionLoading === 'save-doc'}>
                              {t('application.documents.cancel')}
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
                              {t('application.documents.edit')}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AutoAwesomeIcon />}
                              onClick={() => startReviseDocument(doc)}
                              disabled={!!actionLoading || isEditing}
                            >
                              {t('application.documents.reviseWithAi')}
                            </Button>
                            <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => runExportPdf(doc._id)} disabled={!!actionLoading}>
                              {t('application.documents.generatePdf')}
                            </Button>
                            {doc.cv.pdfFile?.fileId && (
                              <Button size="small" href={`/api/files/${doc.cv.pdfFile.fileId}`} target="_blank">
                                {t('application.documents.downloadCv')}
                              </Button>
                            )}
                            {doc.coverLetter.pdfFile?.fileId && (
                              <Button size="small" href={`/api/files/${doc.coverLetter.pdfFile.fileId}`} target="_blank">
                                {t('application.documents.downloadCoverLetter')}
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
                                {t('application.documents.delete')}
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
              <Button color="inherit" size="small" onClick={() => setInterviewDialog(true)}>{t('application.interview.startPrep')}</Button>
            }>
              {t('application.interview.statusHint')}
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {company?.description && (
                <Card><CardContent>
                  <Typography variant="subtitle2">{t('application.interview.companyInfo')}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{company.description}</Typography>
                </CardContent></Card>
              )}
              <Card><CardContent>
                <Typography variant="subtitle2">{t('application.interview.companyResearch')}</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{app.interviewPrep.companyResearch}</Typography>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">{t('application.interview.elevatorPitch')}</Typography>
                <Typography variant="body2">{app.interviewPrep.elevatorPitch}</Typography>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">{t('application.interview.questionsToAsk')}</Typography>
                <List dense>{app.interviewPrep.questionsToAsk.map((q) => <ListItem key={q} disablePadding><ListItemText primary={q} /></ListItem>)}</List>
              </CardContent></Card>
              <Card><CardContent>
                <Typography variant="subtitle2">{t('application.interview.likelyQuestions')}</Typography>
                <List dense>{app.interviewPrep.likelyQuestions.map((q) => <ListItem key={q} disablePadding><ListItemText primary={q} /></ListItem>)}</List>
              </CardContent></Card>
            </Box>
          )}
        </Box>
      )}

      {tab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField fullWidth size="small" placeholder={t('application.notes.placeholder')} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button variant="contained" onClick={addNote}>{t('application.notes.add')}</Button>
          </Box>
          <List>
            {app.notes.map((n) => (
              <ListItem key={n._id} alignItems="flex-start">
                <ListItemText primary={n.text} secondary={formatDateTime(n.createdAt)} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Dialog open={generateDialog} onClose={() => !actionLoading && setGenerateDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('application.generateDialog.title')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('application.generateDialog.help')}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>{t('application.generateDialog.cvTemplate')}</InputLabel>
            <Select
              value={selectedCvTemplateId}
              label={t('application.generateDialog.cvTemplate')}
              onChange={(e) => setSelectedCvTemplateId(e.target.value)}
            >
              <MenuItem value="">{t('application.generateDialog.automatic')}</MenuItem>
              {cvTemplates.map((cv) => (
                <MenuItem key={cv._id} value={cv._id}>
                  {cv.name}{cv.isDefault ? t('application.generateDialog.defaultSuffix') : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('application.generateDialog.appTemplate')}</InputLabel>
            <Select
              value={selectedAppTemplateId}
              label={t('application.generateDialog.appTemplate')}
              onChange={(e) => setSelectedAppTemplateId(e.target.value)}
            >
              <MenuItem value="">{t('application.generateDialog.noTemplate')}</MenuItem>
              {appTemplates.map((template) => (
                <MenuItem key={template._id} value={template._id}>
                  {template.name}{template.isDefault ? t('application.generateDialog.defaultSuffix') : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {cvTemplates.length === 0 && appTemplates.length === 0 && (
            <Alert severity="info">
              {t('application.generateDialog.noTemplatesAlert')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialog(false)} disabled={actionLoading === 'generate'}>
            {t('application.generateDialog.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={runGenerate}
            disabled={actionLoading === 'generate'}
            startIcon={actionLoading === 'generate' ? <CircularProgress size={16} /> : undefined}
          >
            {t('application.generateDialog.generate')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={emailDialog} onClose={() => setEmailDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('application.emailDialog.title')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {emailError && <Alert severity="error">{emailError}</Alert>}
          <TextField label={t('application.emailDialog.to')} fullWidth value={emailForm.to} onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })} />
          <TextField label={t('application.emailDialog.subject')} fullWidth value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} />
          <TextField label={t('application.emailDialog.body')} fullWidth multiline rows={8} value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} />
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {t('application.emailDialog.attachRecommendations')}
            </Typography>
            {recommendations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t('application.emailDialog.noRecommendations')}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {recommendations.map((rec) => (
                  <FormControlLabel
                    key={rec._id}
                    control={
                      <Checkbox
                        checked={selectedRecommendationIds.includes(rec._id)}
                        onChange={() => toggleRecommendation(rec._id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{rec.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rec.from ? `${rec.from} · ` : ''}
                          {rec.originalFile.fileName}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </Box>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {t('application.emailDialog.footerBase')}
            {selectedRecommendationIds.length > 0
              ? t(
                  selectedRecommendationIds.length === 1
                    ? 'application.emailDialog.footerRecsSingular'
                    : 'application.emailDialog.footerRecsPlural',
                  { count: selectedRecommendationIds.length }
                )
              : ''}
            {t('application.emailDialog.footerSettings')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailDialog(false)}>{t('application.emailDialog.cancel')}</Button>
          <Button variant="contained" onClick={submitEmail} disabled={!!actionLoading || !emailForm.to}>
            {t('application.emailDialog.send')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog} onClose={() => !deleting && setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('application.deleteJob.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {displayCompanyName
              ? t('application.deleteJob.confirm', { title: app.job.title, company: displayCompanyName })
              : t('application.deleteJob.confirmNoCompany', { title: app.job.title })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)} disabled={deleting}>{t('application.deleteJob.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : t('application.deleteJob.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!documentToDelete}
        onClose={() => !deletingDocument && setDocumentToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t('application.deleteDoc.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('application.deleteDoc.confirm', {
              version: documentToDelete?.version || '',
              labelSuffix: documentToDelete?.label ? ` — ${documentToDelete.label}` : '',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentToDelete(null)} disabled={deletingDocument}>{t('application.deleteDoc.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteDocument} disabled={deletingDocument}>
            {deletingDocument ? <CircularProgress size={16} /> : t('application.deleteDoc.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={interviewDialog} onClose={() => setInterviewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('application.interviewDialog.title')}</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>{t('application.interviewDialog.round')}</Typography>
          <RadioGroup value={interviewContext.round} onChange={(e) => setInterviewContext({ ...interviewContext, round: e.target.value as InterviewRound })}>
            <FormControlLabel value="first" control={<Radio />} label={t('application.interviewDialog.roundFirst')} />
            <FormControlLabel value="second" control={<Radio />} label={t('application.interviewDialog.roundSecond')} />
            <FormControlLabel value="third" control={<Radio />} label={t('application.interviewDialog.roundThird')} />
            <FormControlLabel value="final" control={<Radio />} label={t('application.interviewDialog.roundFinal')} />
          </RadioGroup>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>{t('application.interviewDialog.type')}</Typography>
          <RadioGroup value={interviewContext.type} onChange={(e) => setInterviewContext({ ...interviewContext, type: e.target.value as InterviewType })}>
            <FormControlLabel value="general" control={<Radio />} label={t('application.interviewDialog.typeGeneral')} />
            <FormControlLabel value="technical" control={<Radio />} label={t('application.interviewDialog.typeTechnical')} />
            <FormControlLabel value="case" control={<Radio />} label={t('application.interviewDialog.typeCase')} />
            <FormControlLabel value="hr" control={<Radio />} label={t('application.interviewDialog.typeHr')} />
          </RadioGroup>
          <Typography variant="subtitle2" sx={{ mt: 2 }}>{t('application.interviewDialog.format')}</Typography>
          <RadioGroup value={interviewContext.format} onChange={(e) => setInterviewContext({ ...interviewContext, format: e.target.value as InterviewFormat })}>
            <FormControlLabel value="online" control={<Radio />} label={t('application.interviewDialog.formatOnline')} />
            <FormControlLabel value="physical" control={<Radio />} label={t('application.interviewDialog.formatPhysical')} />
            <FormControlLabel value="hybrid" control={<Radio />} label={t('application.interviewDialog.formatHybrid')} />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterviewDialog(false)}>{t('application.interviewDialog.cancel')}</Button>
          <Button variant="contained" onClick={submitInterviewPrep} disabled={actionLoading === 'interview'}>
            {t('application.interviewDialog.generatePrep')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
