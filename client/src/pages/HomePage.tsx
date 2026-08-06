import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Skeleton,
  Button,
  Chip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { api } from '../services/api';
import StatusBadge from '../components/pipeline/StatusBadge';
import type { DashboardAttentionReason, DashboardData } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

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
      <Box>
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={100} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={160} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={160} />
      </Box>
    );
  }

  const pipeline = data?.pipeline;
  const needsAttention = data?.needsAttention ?? [];
  const upcoming = data?.upcoming ?? [];
  const recentApplications = data?.recentApplications ?? [];

  const overviewItems = [
    { key: 'active', value: pipeline?.active ?? 0, color: 'text.primary' as const },
    { key: 'needsAttention', value: needsAttention.length, color: 'warning.main' as const },
    { key: 'interviews', value: pipeline?.interviews ?? 0, color: 'success.main' as const },
    { key: 'offers', value: pipeline?.offers ?? 0, color: 'success.main' as const },
  ];

  const pipelineChips = [
    { key: 'inProgress', count: pipeline?.inProgress ?? 0, color: 'default' as const },
    { key: 'readyForReview', count: pipeline?.readyForReview ?? 0, color: 'warning' as const },
    { key: 'readyToSend', count: pipeline?.readyToSend ?? 0, color: 'secondary' as const },
    { key: 'sent', count: pipeline?.sent ?? 0, color: 'primary' as const },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <CardActionArea onClick={() => navigate('/new')} sx={{ p: 0 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <AddCircleOutlineIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>{t('home.newJobPosting')}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>{t('home.newJobPostingHint')}</Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('home.overview')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              mt: 0.5,
              mb: 2,
            }}
          >
            {overviewItems.map((item) => (
              <Box
                key={item.key}
                component="button"
                type="button"
                onClick={() => navigate('/pipeline')}
                sx={{
                  border: 0,
                  bgcolor: 'transparent',
                  p: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  textAlign: 'center',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography variant="h5" fontWeight={700} color={item.color}>
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t(`home.overviewStats.${item.key}`)}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {pipelineChips.map((chip) => (
              <Chip
                key={chip.key}
                size="small"
                label={t(`home.${chip.key}`, { count: chip.count })}
                color={chip.color}
                variant="outlined"
                onClick={() => navigate('/pipeline')}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ pb: needsAttention.length ? 1 : undefined }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {t('home.needsAttention')}
          </Typography>
          {needsAttention.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('home.noAttention')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {needsAttention.map((item) => (
                <Card key={`${item._id}-${item.reason}`} variant="outlined">
                  <CardActionArea onClick={() => navigate(`/applications/${item._id}`)}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {item.companyName}
                          </Typography>
                          <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                            {attentionLabel(t, item.reason, item.unansweredQuestions)}
                          </Typography>
                        </Box>
                        <StatusBadge status={item.status} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <CardContent sx={{ pb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('home.upcoming')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              {upcoming.map((item) => (
                <Card key={`${item.type}-${item._id}-${item.at}`} variant="outlined">
                  <CardActionArea onClick={() => navigate(`/applications/${item._id}`)}>
                    <CardContent sx={{ py: 1.5, display: 'flex', gap: 1.5, alignItems: 'center', '&:last-child': { pb: 1.5 } }}>
                      {item.type === 'interview' ? (
                        <EventAvailableIcon color="success" fontSize="small" />
                      ) : (
                        <ScheduleIcon color="warning" fontSize="small" />
                      )}
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={600} noWrap>
                          {item.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {item.companyName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.type === 'interview'
                            ? t('home.upcomingInterview', { date: formatDateTime(item.at) })
                            : t('home.upcomingDeadline', { date: formatDate(item.at) })}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent sx={{ pb: recentApplications.length ? 1 : undefined }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t('home.recentApplications')}
            </Typography>
            <Button size="small" onClick={() => navigate('/pipeline')}>
              {t('home.seeFullPipeline')}
            </Button>
          </Box>
          {recentApplications.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t('home.noApplications')}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentApplications.map((app) => (
                <Card key={app._id} variant="outlined">
                  <CardActionArea onClick={() => navigate(`/applications/${app._id}`)}>
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle2" fontWeight={600} noWrap>
                            {app.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {app.companyName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t('home.updatedAt', { date: formatDate(app.updatedAt) })}
                          </Typography>
                        </Box>
                        <StatusBadge status={app.status} />
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
