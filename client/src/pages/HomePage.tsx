import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  Handshake,
  MessagesSquare,
} from 'lucide-react';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import type { DashboardAttentionReason, DashboardData } from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import {
  Card,
  CardButton,
  CardHeader,
  EmptyState,
  FilterChip,
  PageHeader,
  Skeleton,
  StatCard,
} from '../ui';

function attentionLabel(
  t: (key: string, params?: Record<string, string | number>) => string,
  reason: DashboardAttentionReason,
  unansweredQuestions?: number
) {
  if (reason === 'ai_question') {
    return unansweredQuestions
      ? t('tasks.ai_question', { count: unansweredQuestions })
      : t('tasks.ai_question_fallback');
  }
  return t(`tasks.${reason}`);
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t, formatDate, formatDateTime } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const pipeline = data?.pipeline;
  const needsAttention = data?.needsAttention ?? [];
  const upcoming = data?.upcoming ?? [];
  const recentApplications = data?.recentApplications ?? [];

  const overviewItems = [
    {
      key: 'active',
      value: pipeline?.active ?? 0,
      icon: <BriefcaseBusiness size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      key: 'needsAttention',
      value: needsAttention.length,
      icon: <CircleAlert size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-warning-soft text-warning',
    },
    {
      key: 'interviews',
      value: pipeline?.interviews ?? 0,
      icon: <MessagesSquare size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-success-soft text-success',
    },
    {
      key: 'offers',
      value: pipeline?.offers ?? 0,
      icon: <Handshake size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-info-soft text-info',
    },
  ];

  const pipelineChips = [
    { key: 'inProgress', count: pipeline?.inProgress ?? 0 },
    { key: 'readyForReview', count: pipeline?.readyForReview ?? 0 },
    { key: 'readyToSend', count: pipeline?.readyToSend ?? 0 },
    { key: 'sent', count: pipeline?.sent ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <PageHeader title={t('home.title')} subtitle={t('home.subtitle')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {overviewItems.map((item) => (
          <StatCard
            key={item.key}
            icon={item.icon}
            iconClassName={item.iconClassName}
            value={item.value}
            label={t(`home.overviewStats.${item.key}`)}
            onClick={() => navigate('/pipeline')}
          />
        ))}
      </div>

      <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {pipelineChips.map((chip) => (
          <FilterChip key={chip.key} onClick={() => navigate('/pipeline')}>
            {t(`home.${chip.key}`, { count: chip.count })}
          </FilterChip>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title={t('home.needsAttention')} />
          {needsAttention.length === 0 ? (
            <p className="text-sm text-ink-secondary">{t('home.noAttention')}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {needsAttention.map((item) => (
                <CardButton
                  key={`${item._id}-${item.reason}`}
                  padding="sm"
                  onClick={() => navigate(`/applications/${item._id}`)}
                  className="border-line shadow-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                      <div className="truncate text-sm text-ink-secondary">{item.companyName}</div>
                      <div className="mt-1 text-xs font-semibold text-warning">
                        {attentionLabel(t, item.reason, item.unansweredQuestions)}
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                </CardButton>
              ))}
            </div>
          )}
        </Card>

        {upcoming.length > 0 && (
          <Card>
            <CardHeader title={t('home.upcoming')} />
            <div className="flex flex-col gap-2">
              {upcoming.map((item) => (
                <CardButton
                  key={`${item.type}-${item._id}-${item.at}`}
                  padding="sm"
                  onClick={() => navigate(`/applications/${item._id}`)}
                  className="border-line shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        item.type === 'interview'
                          ? 'inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-success-soft text-success'
                          : 'inline-flex h-9 w-9 items-center justify-center rounded-[12px] bg-warning-soft text-warning'
                      }
                    >
                      <CalendarClock size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{item.title}</div>
                      <div className="truncate text-sm text-ink-secondary">{item.companyName}</div>
                      <div className="mt-0.5 text-xs text-ink-muted">
                        {item.type === 'interview'
                          ? t('home.upcomingInterview', { date: formatDateTime(item.at) })
                          : t('home.upcomingDeadline', { date: formatDate(item.at) })}
                      </div>
                    </div>
                  </div>
                </CardButton>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader
          title={t('home.recentApplications')}
          action={
            <button
              type="button"
              onClick={() => navigate('/pipeline')}
              className="text-sm font-semibold text-brand hover:text-brand-hover"
            >
              {t('home.seeFullPipeline')}
            </button>
          }
        />
        {recentApplications.length === 0 ? (
          <EmptyState>{t('home.noApplications')}</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {recentApplications.map((app) => (
              <CardButton
                key={app._id}
                padding="sm"
                onClick={() => navigate(`/applications/${app._id}`)}
                className="border-line shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{app.title}</div>
                    <div className="truncate text-sm text-ink-secondary">{app.companyName}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">
                      {t('home.updatedAt', { date: formatDate(app.updatedAt) })}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
              </CardButton>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
