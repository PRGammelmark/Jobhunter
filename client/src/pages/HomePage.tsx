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

export default function HomePage() {
  const navigate = useNavigate();
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
              <Typography variant="h6" fontWeight={700}>Nyt stillingsopslag</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Indsæt joblink eller tekst</Typography>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Pipeline</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            <Chip label={`${pipeline?.active ?? 0} aktive`} onClick={() => navigate('/pipeline')} />
            <Chip label={`${pipeline?.readyToSend ?? 0} klar til send`} color="secondary" variant="outlined" onClick={() => navigate('/pipeline')} />
            <Chip label={`${pipeline?.interviews ?? 0} interviews`} color="success" variant="outlined" onClick={() => navigate('/pipeline')} />
            <Chip label={`${pipeline?.offers ?? 0} tilbud`} color="success" onClick={() => navigate('/pipeline')} />
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>Dagens opgaver</Typography>
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
                      primary={task.label}
                      secondary={task.companyName}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">Ingen opgaver lige nu</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Nylige virksomheder</Typography>
            <Button size="small" onClick={() => navigate('/companies')}>Se alle</Button>
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
            <Typography variant="body2" color="text.secondary">Ingen virksomheder endnu</Typography>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<BusinessIcon />}
            sx={{ mt: 1.5 }}
            onClick={() => navigate('/companies/new')}
          >
            Ny virksomhed
          </Button>
        </CardContent>
      </Card>

      <Button variant="outlined" fullWidth onClick={() => navigate('/pipeline')}>
        Se fuld pipeline
      </Button>
    </Box>
  );
}
