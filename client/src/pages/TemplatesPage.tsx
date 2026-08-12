import { useState, useRef } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import EditNoteIcon from '@mui/icons-material/EditNote';
import {
  APPLICATION_TEMPLATE_TYPE_IDS,
  DEFAULT_APPLICATION_TEMPLATE_TYPE_ID,
  getApplicationTemplateType,
  resolveDefaultApplicationTemplate,
  type ApplicationTemplate,
  type DefaultApplicationTemplatePreference,
} from '@career-intelligence/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale } from '../i18n';
import {
  useApplicationTemplates,
  useCreateApplicationTemplate,
  useCreateApplicationTemplateManual,
  useDeleteApplicationTemplate,
  useSettings,
  useUpdateSettings,
} from '../queries';
import { keys } from '../queries/keys';
import { PageHeader } from '../ui';
import {
  TemplateList,
  DocumentViewerDialog,
  DeleteDocumentDialog,
  type ViewableDocument,
} from './cv/shared';

function BulletSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
        {title}
      </Typography>
      <List dense disablePadding>
        {items.map((item) => (
          <ListItem key={item} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
            <Typography component="span" sx={{ mr: 1, lineHeight: 1.5 }} color="text.secondary">
              •
            </Typography>
            <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}

export default function TemplatesPage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { data: appTemplates, isPending } = useApplicationTemplates();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
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
  const savingDefault = updateSettings.isPending;

  const legacyDefaultId = templateList.find((a) => a.isDefault)?._id || null;
  const defaultPref = resolveDefaultApplicationTemplate(
    settings?.preferences?.defaultApplicationTemplate,
    {
      legacyUserDefaultId: legacyDefaultId,
      userTemplateExists: (id) => templateList.some((a) => a._id === id),
    }
  );

  const setDefaultPreference = async (next: DefaultApplicationTemplatePreference) => {
    if (!settings) return;
    await updateSettings.mutateAsync({
      preferences: {
        ...settings.preferences,
        defaultLanguage: settings.preferences?.defaultLanguage || 'da',
        aiModel: settings.preferences?.aiModel || 'gpt-4o-mini',
        defaultApplicationTemplate: next,
      },
    });
  };

  const toggleDefault = async (
    next: DefaultApplicationTemplatePreference,
    checked: boolean
  ) => {
    if (checked) {
      await setDefaultPreference(next);
      return;
    }
    const isCurrent =
      defaultPref.source === next.source && defaultPref.id === next.id;
    if (!isCurrent) return;
    // Product default cannot be cleared — only replaced by choosing another template
    if (
      next.source === 'builtin' &&
      next.id === DEFAULT_APPLICATION_TEMPLATE_TYPE_ID
    ) {
      return;
    }
    await setDefaultPreference({
      source: 'builtin',
      id: DEFAULT_APPLICATION_TEMPLATE_TYPE_ID,
    });
  };

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
      // Server may reset default preference when the deleted template was selected
      void queryClient.invalidateQueries({ queryKey: keys.settings });
    } catch {
      // keep dialog open
    }
  };

  return (
    <Box>
      <PageHeader title={t('templates.title')} subtitle={t('templates.subtitle')} />

      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('templates.builtinSection')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('templates.builtinIntro')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4 }}>
        {APPLICATION_TEMPLATE_TYPE_IDS.map((typeId) => {
          const type = getApplicationTemplateType(typeId, locale);
          const isDefault =
            defaultPref.source === 'builtin' && defaultPref.id === typeId;
          return (
            <Accordion key={typeId} disableGutters variant="outlined">
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`${typeId}-content`}
                id={`${typeId}-header`}
              >
                <Box
                  sx={{
                    pr: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 1,
                    width: '100%',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {type.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {type.intro}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    sx={{ mr: 0, ml: 0, flexShrink: 0, alignItems: 'center' }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    control={
                      <Switch
                        size="small"
                        checked={isDefault}
                        disabled={savingDefault || !settings}
                        onChange={(_, checked) =>
                          void toggleDefault({ source: 'builtin', id: typeId }, checked)
                        }
                      />
                    }
                    label={
                      <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
                        {t('templates.setAsDefault')}
                      </Typography>
                    }
                    labelPlacement="start"
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <BulletSection title={t('templates.structure')} items={type.structure} />
                <BulletSection title={t('templates.strengths')} items={type.strengths} />
                <BulletSection title={t('templates.weaknesses')} items={type.weaknesses} />
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" sx={{ mb: 2 }}>
        {t('templates.yourTemplatesSection')}
      </Typography>

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
        isDefault={(item) => defaultPref.source === 'user' && defaultPref.id === item._id}
        onDefaultChange={(item, checked) => {
          void toggleDefault({ source: 'user', id: item._id }, checked);
        }}
        defaultSwitchLabel={t('templates.setAsDefault')}
        defaultSwitchDisabled={savingDefault || !settings}
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
