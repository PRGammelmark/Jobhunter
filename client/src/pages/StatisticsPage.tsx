import { useEffect, useState } from 'react';
import {
  ChartColumn,
  Clock3,
  MessageSquareReply,
  Percent,
  Send,
  ThumbsDown,
} from 'lucide-react';
import { api } from '../services/api';
import type { Statistics } from '@career-intelligence/shared';
import { useLocale } from '../i18n';
import { Card, CardHeader, PageHeader, Skeleton, StatCard } from '../ui';

export default function StatisticsPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatistics().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton className="h-80" />;

  const items = [
    {
      label: t('statistics.sent'),
      value: stats?.sent ?? 0,
      icon: <Send size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-brand-soft text-brand',
    },
    {
      label: t('statistics.responseRate'),
      value: `${stats?.responseRate ?? 0}%`,
      icon: <MessageSquareReply size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-success-soft text-success',
    },
    {
      label: t('statistics.interviewRate'),
      value: `${stats?.interviewRate ?? 0}%`,
      icon: <Percent size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-info-soft text-info',
    },
    {
      label: t('statistics.offerRate'),
      value: `${stats?.offerRate ?? 0}%`,
      icon: <ChartColumn size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-warning-soft text-warning',
    },
    {
      label: t('statistics.rejectionRate'),
      value: `${stats?.rejectionRate ?? 0}%`,
      icon: <ThumbsDown size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-danger-soft text-danger',
    },
    {
      label: t('statistics.avgResponse'),
      value: t('statistics.days', { count: stats?.avgResponseDays ?? 0 }),
      icon: <Clock3 size={18} strokeWidth={1.75} />,
      iconClassName: 'bg-canvas text-ink-secondary',
    },
  ];

  return (
    <div>
      <PageHeader title={t('statistics.title')} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {items.map((item) => (
          <StatCard
            key={item.label}
            icon={item.icon}
            iconClassName={item.iconClassName}
            value={item.value}
            label={item.label}
          />
        ))}
      </div>

      {stats?.cvPerformance && stats.cvPerformance.length > 0 && (
        <Card className="mt-4">
          <CardHeader title={t('statistics.cvPerformance')} />
          <div className="divide-y divide-line">
            {stats.cvPerformance.map((cv) => (
              <div
                key={cv.cvTemplateId}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="text-sm font-medium text-ink">{cv.name}</span>
                <span className="text-sm text-ink-secondary">
                  {t('statistics.cvStats', { times: cv.timesUsed, interviews: cv.interviews })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
