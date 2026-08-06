import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LoaderCircle, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import WishlistButton from '../components/pipeline/WishlistButton';
import { APPLICATION_STATUSES, type Application, type ApplicationStatus } from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import {
  Button,
  Card,
  Dialog,
  DialogCancelButton,
  EmptyState,
  FilterChip,
  IconButton,
  PageHeader,
  Skeleton,
} from '../ui';

export default function PipelinePage() {
  const navigate = useNavigate();
  const { t, formatDate } = useLocale();
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
    <div>
      <PageHeader title={t('pipeline.title')} subtitle={t('pipeline.subtitle')} />

      <div className="mb-4 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          active={filter === 'all'}
          count={applications.length}
          onClick={() => setFilter('all')}
        >
          {t('pipeline.all')}
        </FilterChip>
        {APPLICATION_STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={filter === s}
            count={statusCounts[s]}
            onClick={() => setFilter(s)}
          >
            {t(`status.${s}`)}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState>{t('pipeline.empty')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((app) => (
            <Card key={app._id} padding="none" className="overflow-hidden">
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => navigate(`/applications/${app._id}`)}
                  className="min-w-0 flex-1 p-4 text-left transition-colors hover:bg-canvas/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-canvas text-ink-secondary">
                        <Building2 size={18} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-bold text-ink">
                          {app.job.title}
                        </div>
                        <div className="truncate text-sm text-ink-secondary">
                          {app.job.companyName}
                        </div>
                        {app.job.summary && (
                          <div className="mt-1 line-clamp-1 text-sm text-ink-muted">
                            {app.job.summary.slice(0, 100)}
                            {app.job.summary.length > 100 ? '…' : ''}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-ink-muted">
                          {t('home.updatedAt', { date: formatDate(app.updatedAt) })}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                </button>
                <div className="flex flex-col items-center justify-center gap-0 border-l border-line px-1.5">
                  <WishlistButton
                    isWishlisted={!!app.isWishlisted}
                    onToggle={() => toggleWishlist(app)}
                  />
                  <IconButton
                    label={t('pipeline.deleteAria', { title: app.job.title })}
                    tone="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setToDelete(app);
                    }}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </IconButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        title={t('pipeline.deleteTitle')}
        actions={
          <>
            <DialogCancelButton onClick={() => setToDelete(null)} disabled={deleting}>
              {t('common.cancel')}
            </DialogCancelButton>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <LoaderCircle size={16} className="animate-spin" /> : t('common.delete')}
            </Button>
          </>
        }
      >
        {toDelete?.job.companyName
          ? t('pipeline.deleteConfirm', {
              title: toDelete.job.title,
              company: toDelete.job.companyName,
            })
          : t('pipeline.deleteConfirmNoCompany', { title: toDelete?.job.title || '' })}
      </Dialog>
    </div>
  );
}
