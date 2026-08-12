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
  FormControlLabel,
  Switch,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { getFileUrl } from '../../services/api';
import type { CvTemplate, ApplicationTemplate, Recommendation } from '@career-intelligence/shared';
import { useLocale } from '../../i18n';

export type TemplateItem = CvTemplate | ApplicationTemplate;
export type ViewableDocument = TemplateItem | Recommendation;

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function canPreviewInline(item: TemplateItem): boolean {
  const mime = item.originalFile?.mimeType;
  return mime === 'application/pdf' || mime === 'text/plain' || !!item.parsedContent?.rawText;
}

export function TemplateList({
  items,
  loading,
  emptyLabel,
  previewLabel,
  onDelete,
  onPreview,
  isDefault,
  onDefaultChange,
  defaultSwitchLabel,
  defaultSwitchDisabled,
}: {
  items: TemplateItem[];
  loading: boolean;
  emptyLabel: string;
  previewLabel: string;
  onDelete: (item: TemplateItem) => void;
  onPreview: (item: TemplateItem) => void;
  /** When set with onDefaultChange, shows a switch instead of the default chip. */
  isDefault?: (item: TemplateItem) => boolean;
  onDefaultChange?: (item: TemplateItem, checked: boolean) => void;
  defaultSwitchLabel?: string;
  defaultSwitchDisabled?: boolean;
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
      {items.map((item) => {
        const checked = isDefault ? isDefault(item) : item.isDefault;
        return (
        <Card key={item._id} sx={{ mb: 1.5 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>{item.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                {onDefaultChange ? (
                  <FormControlLabel
                    sx={{ mr: 0.5, ml: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={checked}
                        disabled={defaultSwitchDisabled}
                        onChange={(_, next) => onDefaultChange(item, next)}
                      />
                    }
                    label={
                      <Typography variant="caption" color="text.secondary">
                        {defaultSwitchLabel || t('templates.setAsDefault')}
                      </Typography>
                    }
                    labelPlacement="start"
                  />
                ) : (
                  checked && <Chip label={t('cvTemplates.default')} size="small" color="primary" />
                )}
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
              {item.tags.map((tag) => <Chip key={tag} label={tag} size="small" variant="outlined" />)}
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
      );
      })}
    </>
  );
}

export function DocumentViewerDialog({
  viewer,
  onClose,
}: {
  viewer: ViewableDocument | null;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const viewerUrl = viewer?.originalFile?.fileId ? getFileUrl(viewer.originalFile.fileId) : '';
  const viewerIsPdf = viewer?.originalFile?.mimeType === 'application/pdf';
  const viewerText =
    viewer && 'parsedContent' in viewer ? viewer.parsedContent?.rawText : undefined;

  return (
    <Dialog
      open={!!viewer}
      onClose={onClose}
      fullWidth
      maxWidth={viewerIsPdf ? 'lg' : 'md'}
      fullScreen={viewerIsPdf}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        {viewer?.name}
        <IconButton onClick={onClose} aria-label={t('cvTemplates.viewer.closeAria')}>
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
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
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
          <Button onClick={onClose}>{t('cvTemplates.viewer.close')}</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}

export function DeleteDocumentDialog({
  open,
  title,
  name,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  name: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} onClose={() => !deleting && onCancel()} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          {t('cvTemplates.deleteDialog.confirm', { name })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={deleting}>{t('cvTemplates.deleteDialog.cancel')}</Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={deleting}>
          {t('cvTemplates.deleteDialog.confirmAction')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
