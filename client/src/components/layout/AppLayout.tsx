import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Fab,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DescriptionIcon from '@mui/icons-material/Description';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import MoreMenu from './MoreMenu';

const NAV_ITEMS = [
  { label: 'Hjem', value: '/', icon: <HomeIcon /> },
  { label: 'Pipeline', value: '/pipeline', icon: <ViewKanbanIcon /> },
  { label: 'Knowledge', value: '/knowledge', icon: <PsychologyIcon /> },
  { label: 'CV & templates', value: '/cv', icon: <DescriptionIcon /> },
  { label: 'Mere', value: 'more', icon: <MoreHorizIcon /> },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const currentNav =
    NAV_ITEMS.find((item) => item.value !== 'more' && location.pathname.startsWith(item.value) && item.value !== '/')
      ?.value ||
    (location.pathname === '/' ? '/' : 'more');

  const isKnowledgePage = location.pathname.startsWith('/knowledge');
  const isCompaniesPage = location.pathname.startsWith('/companies');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', pb: 10 }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Jobhunter
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, px: 2, py: 2, maxWidth: 720, mx: 'auto', width: '100%' }}>
        <Outlet />
      </Box>

      {!isKnowledgePage && !isCompaniesPage && (
        <Fab
          variant="extended"
          color="secondary"
          aria-label="Nyt stillingsopslag"
          sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1100 }}
          onClick={() => navigate('/new')}
        >
          <AddIcon sx={{ mr: 1 }} />
          Nyt stillingsopslag
        </Fab>
      )}

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={8}>
        <BottomNavigation
          showLabels
          value={currentNav}
          onChange={(_, value) => {
            if (value === 'more') setMoreOpen(true);
            else navigate(value);
          }}
        >
          {NAV_ITEMS.map((item) => (
            <BottomNavigationAction key={item.value} label={item.label} value={item.value} icon={item.icon} />
          ))}
        </BottomNavigation>
      </Paper>

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </Box>
  );
}
