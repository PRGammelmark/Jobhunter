import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import type { ApplicationTemplate } from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import {
  useApplicationTemplates,
  useCreateApplicationTemplate,
  useCreateApplicationTemplateManual,
  useDeleteApplicationTemplate,
} from '../queries';
import { PageHeader } from '../ui';
import {
  TemplateList,
  DocumentViewerDialog,
  DeleteDocumentDialog,
  type ViewableDocument,
} from './cv/shared';

export default function TemplatesPage() {
  const { t } = useLocale();
  const { data: appTemplates, isPending } = useApplicationTemplates();
  const templateList = appTemplates ?? [];
  const createTemplate = useCreateApplicationTemplate();
  const createManual = useCreateApplicationTemplateManual();
  const deleteTemplate = useDeleteApplicationTemplate();
  const [viewer, setViewer] = useState<ViewableDocument | null>(null);
  const [toDelete, setToDelete] = useState<ApplicationTemplate | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', content: '' });
  const appFileRef = useRef<HTMLInputElement>(null);

  const saving = createManual.isPending;
  const deleting = deleteTemplate.isPending;

  const uploadApp = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', file.name.replace(/\.[^.]+$/, ''));
    await createTemplate.mutateAsync(form);
  };

  const openManual = () => {
    setManualForm({ name: '', content: '' });
    setManualOpen(true);
  };

  const saveManual = async () => {
    if (!manualForm.name.trim() || !manualForm.content.trim()) return;
    try {
      await createManual.mutateAsync({ name: manualForm.name, rawText: manualForm.content });
      setManualOpen(false);
    } catch {
      // keep dialog open
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteTemplate.mutateAsync(toDelete._id);
      if (viewer?._id === toDelete._id) setViewer(null);
      setToDelete(null);
    } catch {
      // keep dialog open
    }
  };

  return (
    <Box>
      <PageHeader title={t('templates.title')} subtitle={t('templates.subtitle')} />

      <input
        ref={appFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        hidden
        onChange={(e) => e.target.files?.[0] && uploadApp(e.target.files[0])}
      />

      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          sx={{ flex: '1 1 140px' }}
          onClick={() => appFileRef.current?.click()}
        >
          {t('cvTemplates.upload.application')}
        </Button>
        <Button
          variant="outlined"
          startIcon={<EditNoteIcon />}
          sx={{ flex: '1 1 140px' }}
          onClick={openManual}
        >
          {t('cvTemplates.addManual')}
        </Button>
      </Box>

      <TemplateList
        items={templateList}
        loading={isPending && !appTemplates}
        emptyLabel={t('cvTemplates.empty.appTemplates')}
        previewLabel={t('cvTemplates.preview.template')}
        onDelete={(item) => setToDelete(item as ApplicationTemplate)}
        onPreview={setViewer}
      />

      <Dialog open={manualOpen} onClose={() => !saving && setManualOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('cvTemplates.manualDialog.titleApp')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label={t('cvTemplates.manualDialog.name')}
            fullWidth
            value={manualForm.name}
            onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
            placeholder={t('cvTemplates.manualDialog.namePlaceholderApp')}
          />
          <TextField
            label={t('cvTemplates.manualDialog.contentApp')}
            fullWidth
            multiline
            rows={12}
            value={manualForm.content}
            onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
            placeholder={t('cvTemplates.manualDialog.contentPlaceholderApp')}
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

      <DeleteDocumentDialog
        open={!!toDelete}
        title={t('cvTemplates.deleteDialog.titleTemplate')}
        name={toDelete?.name || ''}
        deleting={deleting}
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <DocumentViewerDialog viewer={viewer} onClose={() => setViewer(null)} />
    </Box>
  );
}
