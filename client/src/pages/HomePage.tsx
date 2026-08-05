import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Button,
  Chip,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BusinessIcon from '@mui/icons-material/Business';
import { api } from '../services/api';
import type { DashboardData } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  const pipeline = data?.pipeline;

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
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('home.pipeline')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip label={t('home.active', { count: pipeline?.active ?? 0 })} onClick={() => navigate('/pipeline')} />
            <Chip label={t('home.readyToSend', { count: pipeline?.readyToSend ?? 0 })} color="secondary" variant="outlined" onClick={() => navigate('/pipeline')} />
            <Chip label={t('home.interviews', { count: pipeline?.interviews ?? 0 })} color="success" variant="outlined" onClick={() => navigate('/pipeline')} />
            <Chip label={t('home.offers', { count: pipeline?.offers ?? 0 })} color="success" onClick={() => navigate('/pipeline')} />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t('home.todaysTasks')}</Typography>
          {data?.tasks.length ? (
            <List dense disablePadding>
              {data.tasks.map((task) => (
                <ListItem key={task.id} disablePadding sx={{ py: 0.75 }}>
                  <ListItemButton
                    disabled={!task.applicationId}
                    onClick={() => task.applicationId && navigate(`/applications/${task.applicationId}`)}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <RadioButtonUncheckedIcon fontSize="small" color="action" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        task.type === 'ai_question'
                          ? (() => {
                              const count = task.label.match(/\((\d+)\)/)?.[1];
                              return count
                                ? t('tasks.ai_question', { count: Number(count) })
                                : t('tasks.ai_question_fallback');
                            })()
                          : t(`tasks.${task.type}`)
                      }
                      secondary={task.companyName}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">{t('home.noTasks')}</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">{t('home.recentCompanies')}</Typography>
            <Button size="small" onClick={() => navigate('/companies')}>{t('home.seeAll')}</Button>
          </Box>
          {data?.recentCompanies.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {data.recentCompanies.map((c) => (
                <Chip
                  key={c._id}
                  icon={<BusinessIcon />}
                  label={c.name}
                  variant="outlined"
                  onClick={() => navigate(`/companies/${c._id}`)}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">{t('home.noCompanies')}</Typography>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<BusinessIcon />}
            sx={{ mt: 1.5 }}
            onClick={() => navigate('/companies/new')}
          >
            {t('home.newCompany')}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outlined" fullWidth onClick={() => navigate('/pipeline')}>
        {t('home.seeFullPipeline')}
      </Button>
    </Box>
  );
}
