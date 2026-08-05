import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { api, getFileUrl } from '../services/api';
import type {
  CvTemplate,
  ApplicationTemplate,
  Recommendation,
  CvKnowledgeExtractionResult,
  KnowledgeEntryDraft,
} from '@career-intelligence/shared';
import { useLocale } from '../i18n';

type TemplateItem = CvTemplate | ApplicationTemplate;
type DeleteTarget =
  | { type: 'cv' | 'app'; item: TemplateItem }
  | { type: 'recommendation'; item: Recommendation };

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreviewInline(item: TemplateItem): boolean {
  const mime = item.originalFile?.mimeType;
  return mime === 'application/pdf' || mime === 'text/plain' || !!item.parsedContent?.rawText;
}

function TemplateList({
  items,
  loading,
  emptyLabel,
  previewLabel,
  onDelete,
  onPreview,
}: {
  items: TemplateItem[];
  loading: boolean;
  emptyLabel: string;
  previewLabel: string;
  onDelete: (item: TemplateItem) => void;
  onPreview: (item: TemplateItem) => void;
}) {
  const { t } = useLocale();
  if (loading) {
    return [1, 2].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />);
  }
  if (items.length === 0) {
    return <Typography color="text.secondary">{emptyLabel}</Typography>;
  }
  return (
    <>
      {items.map((item) => (
        <Card key={item._id} sx={{ mb: 1.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={600}>{item.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {item.isDefault && <Chip label={t('cvTemplates.default')} size="small" color="primary" />}
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t('cvTemplates.deleteAria', { name: item.name })}
                  onClick={() => onDelete(item)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
              {item.tags.map((t) => <Chip key={t} label={t} size="small" variant="outlined" />)}
            </Box>
            {item.originalFile && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {item.originalFile.fileName}
                {item.originalFile.sizeBytes ? ` · ${formatFileSize(item.originalFile.sizeBytes)}` : ''}
              </Typography>
            )}
            {!item.originalFile && item.parsedContent?.rawText && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('cvTemplates.manualEntered')}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {t('cvTemplates.statsUsed', { times: item.stats.timesUsed, interviews: item.stats.interviewsGenerated })}
            </Typography>
            {(item.originalFile || item.parsedContent?.rawText) && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                {canPreviewInline(item) && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => onPreview(item)}
                  >
                    {previewLabel}
                  </Button>
                )}
                {item.originalFile?.fileId && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    href={getFileUrl(item.originalFile.fileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('cvTemplates.open')}
                  </Button>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export default function CvTemplatesPage() {
  const { t } = useLocale();
  const [tab, setTab] = useState(0);
  const [cvTemplates, setCvTemplates] = useState<CvTemplate[]>([]);
  const [appTemplates, setAppTemplates] = useState<ApplicationTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<TemplateItem | Recommendation | null>(null);
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<CvKnowledgeExtractionResult | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [savingExtract, setSavingExtract] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState<string | null>(null);
  const cvFileRef = useRef<HTMLInputElement>(null);
  const appFileRef = useRef<HTMLInputElement>(null);
  const recFileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [cvs, apps, recs] = await Promise.all([
      api.getCvTemplates(),
      api.getApplicationTemplates(),
      api.getRecommendations(),
    ]);
    setCvTemplates(cvs);
    setAppTemplates(apps);
    setRecommendations(recs);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const uploadCv = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name.replace(/\.[^.]+$/, ''));
    await api.createCvTemplate(form);
    load();
  };

  const uploadApp = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name.replace(/\.[^.]+$/, ''));
    await api.createApplicationTemplate(form);
    load();
  };

  const uploadRecommendation = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name.replace(/\.[^.]+$/, ''));
    await api.createRecommendation(form);
    load();
  };

  const openManual = () => {
    setManualForm({ name: '', content: '' });
    setManualOpen(true);
  };

  const saveManual = async () => {
    if (!manualForm.name.trim() || !manualForm.content.trim()) return;
    setSaving(true);
    try {
      if (tab === 0) {
        await api.createCvTemplateManual({ name: manualForm.name, rawText: manualForm.content });
      } else {
        await api.createApplicationTemplateManual({ name: manualForm.name, rawText: manualForm.content });
      }
      setManualOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.type === 'cv') {
        await api.deleteCvTemplate(toDelete.item._id);
      } else if (toDelete.type === 'app') {
        await api.deleteApplicationTemplate(toDelete.item._id);
      } else {
        await api.deleteRecommendation(toDelete.item._id);
      }
      if (viewer?._id === toDelete.item._id) setViewer(null);
      setToDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const startExtract = async () => {
    setExtractOpen(true);
    setExtracting(true);
    setExtractResult(null);
    setExtractError(null);
    setExtractSuccess(null);
    setSelectedIndexes(new Set());
    try {
      const result = await api.extractCvKnowledge();
      setExtractResult(result);
      setSelectedIndexes(new Set(result.candidates.map((_, i) => i)));
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : t('cvTemplates.extractDialog.errorExtract'));
    } finally {
      setExtracting(false);
    }
  };

  const closeExtract = () => {
    if (extracting || savingExtract) return;
    setExtractOpen(false);
    setExtractResult(null);
    setExtractError(null);
    setExtractSuccess(null);
    setSelectedIndexes(new Set());
  };

  const toggleCandidate = (index: number) => {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!extractResult) return;
    setSelectedIndexes(checked ? new Set(extractResult.candidates.map((_, i) => i)) : new Set());
  };

  const saveSelected = async () => {
    if (!extractResult) return;
    const selected: KnowledgeEntryDraft[] = extractResult.candidates.filter((_, i) =>
      selectedIndexes.has(i)
    );
    if (selected.length === 0) return;

    setSavingExtract(true);
    setExtractError(null);
    try {
      const result = await api.confirmCvKnowledgeExtraction(selected);
      setExtractSuccess(t(
        result.count === 1
          ? 'cvTemplates.extractDialog.success'
          : 'cvTemplates.extractDialog.successPlural',
        { count: result.count }
      ));
      setExtractResult({ ...extractResult, candidates: [] });
      setSelectedIndexes(new Set());
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : t('cvTemplates.extractDialog.errorSave'));
    } finally {
      setSavingExtract(false);
    }
  };

  const viewerUrl = viewer?.originalFile?.fileId ? getFileUrl(viewer.originalFile.fileId) : '';
  const viewerIsPdf = viewer?.originalFile?.mimeType === 'application/pdf';
  const viewerText =
    viewer && 'parsedContent' in viewer ? viewer.parsedContent?.rawText : undefined;
  const selectedCount = selectedIndexes.size;
  const allSelected =
    !!extractResult &&
    extractResult.candidates.length > 0 &&
    selectedCount === extractResult.candidates.length;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>{t('cvTemplates.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('cvTemplates.subtitle')}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
        <Tab label={t('cvTemplates.tabs.cvs')} />
        <Tab label={t('cvTemplates.tabs.appTemplates')} />
        <Tab label={t('cvTemplates.tabs.recommendations')} />
      </Tabs>

      <input
        ref={cvFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        hidden
        onChange={(e) => e.target.files?.[0] && uploadCv(e.target.files[0])}
      />
      <input
        ref={appFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        hidden
        onChange={(e) => e.target.files?.[0] && uploadApp(e.target.files[0])}
      />
      <input
        ref={recFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
        hidden
        onChange={(e) => e.target.files?.[0] && uploadRecommendation(e.target.files[0])}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          sx={{ flex: '1 1 140px' }}
          onClick={() => {
            if (tab === 0) cvFileRef.current?.click();
            else if (tab === 1) appFileRef.current?.click();
            else recFileRef.current?.click();
          }}
        >
          {tab === 0
            ? t('cvTemplates.upload.cv')
            : tab === 1
              ? t('cvTemplates.upload.application')
              : t('cvTemplates.upload.recommendation')}
        </Button>
        {tab < 2 && (
          <Button
            variant="outlined"
            startIcon={<EditNoteIcon />}
            sx={{ flex: '1 1 140px' }}
            onClick={openManual}
          >
            {t('cvTemplates.addManual')}
          </Button>
        )}
        {tab === 0 && (
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            sx={{ flex: '1 1 220px' }}
            onClick={startExtract}
            disabled={loading || cvTemplates.length === 0}
          >
            {t('cvTemplates.extractToKnowledge')}
          </Button>
        )}
      </Box>

      {tab === 0 ? (
        <TemplateList
          items={cvTemplates}
          loading={loading}
          emptyLabel={t('cvTemplates.empty.cvs')}
          previewLabel={t('cvTemplates.preview.cv')}
          onDelete={(item) => setToDelete({ type: 'cv', item })}
          onPreview={setViewer}
        />
      ) : tab === 1 ? (
        <TemplateList
          items={appTemplates}
          loading={loading}
          emptyLabel={t('cvTemplates.empty.appTemplates')}
          previewLabel={t('cvTemplates.preview.template')}
          onDelete={(item) => setToDelete({ type: 'app', item })}
          onPreview={setViewer}
        />
      ) : loading ? (
        [1, 2].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />)
      ) : recommendations.length === 0 ? (
        <Typography color="text.secondary">
          {t('cvTemplates.empty.recommendations')}
        </Typography>
      ) : (
        recommendations.map((item) => (
          <Card key={item._id} sx={{ mb: 1.5 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight={600}>{item.name}</Typography>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t('cvTemplates.deleteAria', { name: item.name })}
                  onClick={() => setToDelete({ type: 'recommendation', item })}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              {item.from && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('cvTemplates.recommendationFrom', { name: item.from })}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {item.originalFile.fileName}
                {item.originalFile.sizeBytes ? ` · ${formatFileSize(item.originalFile.sizeBytes)}` : ''}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                {(item.originalFile.mimeType === 'application/pdf' ||
                  item.originalFile.mimeType === 'text/plain') && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<VisibilityIcon />}
                    onClick={() => setViewer(item)}
                  >
                    {t('cvTemplates.preview.recommendation')}
                  </Button>
                )}
                {item.originalFile.fileId && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<OpenInNewIcon />}
                    href={getFileUrl(item.originalFile.fileId)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('cvTemplates.open')}
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={manualOpen} onClose={() => !saving && setManualOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {tab === 0 ? t('cvTemplates.manualDialog.titleCv') : t('cvTemplates.manualDialog.titleApp')}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label={t('cvTemplates.manualDialog.name')}
            fullWidth
            value={manualForm.name}
            onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
            placeholder={tab === 0 ? t('cvTemplates.manualDialog.namePlaceholderCv') : t('cvTemplates.manualDialog.namePlaceholderApp')}
          />
          <TextField
            label={tab === 0 ? t('cvTemplates.manualDialog.contentCv') : t('cvTemplates.manualDialog.contentApp')}
            fullWidth
            multiline
            rows={12}
            value={manualForm.content}
            onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
            placeholder={
              tab === 0
                ? t('cvTemplates.manualDialog.contentPlaceholderCv')
                : t('cvTemplates.manualDialog.contentPlaceholderApp')
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualOpen(false)} disabled={saving}>{t('cvTemplates.manualDialog.cancel')}</Button>
          <Button
            variant="contained"
            onClick={saveManual}
            disabled={saving || !manualForm.name.trim() || !manualForm.content.trim()}
          >
            {t('cvTemplates.manualDialog.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={extractOpen}
        onClose={closeExtract}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {t('cvTemplates.extractDialog.title')}
          <IconButton onClick={closeExtract} disabled={extracting || savingExtract} aria-label={t('cvTemplates.extractDialog.closeAria')}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {extracting && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {t('cvTemplates.extractDialog.loading')}
              </Typography>
            </Box>
          )}

          {!extracting && extractError && (
            <Alert severity="error" sx={{ mb: 2 }}>{extractError}</Alert>
          )}

          {!extracting && extractSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>{extractSuccess}</Alert>
          )}

          {!extracting && extractResult && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t(
                  extractResult.cvsProcessed === 1
                    ? 'cvTemplates.extractDialog.summaryCvsSingular'
                    : 'cvTemplates.extractDialog.summaryCvsPlural',
                  { count: extractResult.cvsProcessed }
                )}
                {extractResult.cvsSkipped > 0
                  ? t('cvTemplates.extractDialog.summarySkipped', { count: extractResult.cvsSkipped })
                  : ''}
                {extractResult.skippedDuplicates > 0
                  ? t('cvTemplates.extractDialog.summaryDuplicates', { count: extractResult.skippedDuplicates })
                  : ''}
              </Typography>

              {extractResult.candidates.length === 0 ? (
                <Alert severity="info">
                  {t('cvTemplates.extractDialog.noneFound')}
                </Alert>
              ) : (
                <>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={allSelected}
                        indeterminate={selectedCount > 0 && !allSelected}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    }
                    label={t('cvTemplates.extractDialog.selectAll', { count: extractResult.candidates.length })}
                    sx={{ mb: 1 }}
                  />
                  <Divider sx={{ mb: 1 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {extractResult.candidates.map((candidate, index) => (
                      <Card
                        key={`${candidate.type}-${candidate.title}-${index}`}
                        variant="outlined"
                        sx={{
                          opacity: selectedIndexes.has(index) ? 1 : 0.55,
                          borderColor: selectedIndexes.has(index) ? 'primary.main' : undefined,
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Checkbox
                              checked={selectedIndexes.has(index)}
                              onChange={() => toggleCandidate(index)}
                              sx={{ mt: -0.5 }}
                            />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                                <Chip
                                  label={t(`cvTemplates.types.${candidate.type}`)}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {candidate.title}
                                </Typography>
                              </Box>
                              {candidate.type === 'employment' && candidate.employment && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {[
                                    candidate.employment.role,
                                    candidate.employment.company,
                                    [candidate.employment.startDate, candidate.employment.isCurrent ? t('common.present') : candidate.employment.endDate]
                                      .filter(Boolean)
                                      .join(' – '),
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Typography>
                              )}
                              {candidate.description && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {candidate.description}
                                </Typography>
                              )}
                              {candidate.keywords.length > 0 && (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                  {candidate.keywords.slice(0, 6).map((kw) => (
                                    <Chip key={kw} label={kw} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExtract} disabled={extracting || savingExtract}>
            {extractSuccess ? t('cvTemplates.extractDialog.close') : t('cvTemplates.extractDialog.cancel')}
          </Button>
          {!extractSuccess && extractResult && extractResult.candidates.length > 0 && (
            <Button
              variant="contained"
              onClick={saveSelected}
              disabled={savingExtract || selectedCount === 0}
              startIcon={savingExtract ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {t('cvTemplates.extractDialog.addSelected', { count: selectedCount })}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {toDelete?.type === 'cv'
            ? t('cvTemplates.deleteDialog.titleCv')
            : toDelete?.type === 'recommendation'
              ? t('cvTemplates.deleteDialog.titleRecommendation')
              : t('cvTemplates.deleteDialog.titleTemplate')}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {t('cvTemplates.deleteDialog.confirm', { name: toDelete?.item.name || '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>{t('cvTemplates.deleteDialog.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {t('cvTemplates.deleteDialog.confirmAction')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!viewer}
        onClose={() => setViewer(null)}
        fullWidth
        maxWidth={viewerIsPdf ? 'lg' : 'md'}
        fullScreen={viewerIsPdf}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
          {viewer?.name}
          <IconButton onClick={() => setViewer(null)} aria-label={t('cvTemplates.viewer.closeAria')}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: viewerIsPdf ? 0 : 2, display: 'flex', flexDirection: 'column' }}>
          {viewerIsPdf && viewerUrl && (
            <Box
              component="iframe"
              src={viewerUrl}
              title={viewer?.name}
              sx={{ flex: 1, width: '100%', minHeight: viewerIsPdf ? 'calc(100vh - 120px)' : 400, border: 'none' }}
            />
          )}
          {!viewerIsPdf && viewerText && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {viewerText}
            </Typography>
          )}
          {!viewerIsPdf && !viewerText && viewer?.originalFile && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {t('cvTemplates.viewer.cannotPreview')}
              </Typography>
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                href={viewerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('cvTemplates.viewer.openFile', { fileName: viewer.originalFile.fileName })}
              </Button>
            </Box>
          )}
        </DialogContent>
        {viewer?.originalFile && (
          <DialogActions>
            <Button
              startIcon={<OpenInNewIcon />}
              href={viewerUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('cvTemplates.viewer.openInNewTab')}
            </Button>
            <Button onClick={() => setViewer(null)}>{t('cvTemplates.viewer.close')}</Button>
          </DialogActions>
        )}
      </Dialog>
    </Box>
  );
}
