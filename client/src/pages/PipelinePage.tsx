import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Skeleton,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import WishlistButton from '../components/pipeline/WishlistButton';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

function TabCountLabel({ label, count }: { label: string; count: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box component="span">{label}</Box>
      {count > 0 && (
        <Box
          component="span"
          sx={{
            minWidth: 18,
            height: 18,
            px: 0.5,
            borderRadius: 9,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: 11,
            fontWeight: 600,
            lineHeight: '18px',
            textAlign: 'center',
          }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
}

export default function PipelinePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');
  const [toDelete, setToDelete] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.getApplications().then(setApplications).finally(() => setLoading(false));
  }, []);

  const statusCounts = APPLICATION_STATUSES.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status).length;
      return acc;
    },
    {} as Record<ApplicationStatus, number>
  );

  const filtered =
    filter === 'all' ? applications : applications.filter((a) => a.status === filter);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.deleteApplication(toDelete._id);
      setApplications((prev) => prev.filter((a) => a._id !== toDelete._id));
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const toggleWishlist = async (app: Application) => {
    const next = !app.isWishlisted;
    setApplications((prev) =>
      prev.map((a) => (a._id === app._id ? { ...a, isWishlisted: next } : a))
    );
    try {
      const updated = await api.updateApplicationWishlist(app._id, next);
      setApplications((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    } catch {
      setApplications((prev) =>
        prev.map((a) => (a._id === app._id ? { ...a, isWishlisted: app.isWishlisted } : a))
      );
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>{t('pipeline.title')}</Typography>

      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab
          label={<TabCountLabel label={t('pipeline.all')} count={applications.length} />}
          value="all"
          sx={{ minWidth: 'auto', px: 1.5 }}
        />
        {APPLICATION_STATUSES.map((s) => (
          <Tab
            key={s}
            label={<TabCountLabel label={t(`status.${s}`)} count={statusCounts[s]} />}
            value={s}
            sx={{ minWidth: 'auto', px: 1.5 }}
          />
        ))}
      </Tabs>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 1 }} />)
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary">{t('pipeline.empty')}</Typography>
      ) : (
        filtered.map((app) => (
          <Card key={app._id} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
              <CardActionArea onClick={() => navigate(`/applications/${app._id}`)} sx={{ flex: 1 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{app.job.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{app.job.companyName}</Typography>
                    </Box>
                    <StatusBadge status={app.status} />
                  </Box>
                  {app.job.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} noWrap>
                      {app.job.summary.slice(0, 100)}...
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 1, gap: 0 }}>
                <WishlistButton
                  isWishlisted={!!app.isWishlisted}
                  onToggle={() => toggleWishlist(app)}
                />
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t('pipeline.deleteAria', { title: app.job.title })}
                  onClick={(e) => {
                    e.stopPropagation();
                    setToDelete(app);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Card>
        ))
      )}

      <Dialog open={!!toDelete} onClose={() => !deleting && setToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('pipeline.deleteTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {toDelete?.job.companyName
              ? t('pipeline.deleteConfirm', {
                  title: toDelete.job.title,
                  company: toDelete.job.companyName,
                })
              : t('pipeline.deleteConfirmNoCompany', { title: toDelete?.job.title || '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>{t('common.cancel')}</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
