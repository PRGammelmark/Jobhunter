import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
} from '@mui/material';
import { api } from '../services/api';
import type { Statistics } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

export default function StatisticsPage() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatistics().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="rounded" height={400} />;

  const items = [
    { label: t('statistics.sent'), value: stats?.sent ?? 0 },
    { label: t('statistics.responseRate'), value: `${stats?.responseRate ?? 0}%` },
    { label: t('statistics.interviewRate'), value: `${stats?.interviewRate ?? 0}%` },
    { label: t('statistics.offerRate'), value: `${stats?.offerRate ?? 0}%` },
    { label: t('statistics.rejectionRate'), value: `${stats?.rejectionRate ?? 0}%` },
    { label: t('statistics.avgResponse'), value: t('statistics.days', { count: stats?.avgResponseDays ?? 0 }) },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>{t('statistics.title')}</Typography>
      <Grid container spacing={2}>
        {items.map((item) => (
          <Grid item xs={6} key={item.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} color="primary">{item.value}</Typography>
                <Typography variant="body2" color="text.secondary">{item.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {stats?.cvPerformance && stats.cvPerformance.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>{t('statistics.cvPerformance')}</Typography>
            {stats.cvPerformance.map((cv) => (
              <Box key={cv.cvTemplateId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2">{cv.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('statistics.cvStats', { times: cv.timesUsed, interviews: cv.interviews })}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
