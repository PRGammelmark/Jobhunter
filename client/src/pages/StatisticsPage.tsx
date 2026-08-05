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

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatistics().then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton variant="rounded" height={400} />;

  const items = [
    { label: 'Sendt', value: stats?.sent ?? 0 },
    { label: 'Svar %', value: `${stats?.responseRate ?? 0}%` },
    { label: 'Interviews %', value: `${stats?.interviewRate ?? 0}%` },
    { label: 'Tilbud %', value: `${stats?.offerRate ?? 0}%` },
    { label: 'Afslag %', value: `${stats?.rejectionRate ?? 0}%` },
    { label: 'Gns. svartid', value: `${stats?.avgResponseDays ?? 0} dage` },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>Statistik</Typography>
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
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>CV-performance</Typography>
            {stats.cvPerformance.map((cv) => (
              <Box key={cv.cvTemplateId} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2">{cv.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {cv.timesUsed} brugt · {cv.interviews} interviews
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
