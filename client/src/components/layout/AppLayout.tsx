import { Link, Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
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
import { useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import MoreMenu from './MoreMenu';
import PageTransition from './PageTransition';
import HomePage from '../../pages/HomePage';
import PipelinePage from '../../pages/PipelinePage';
import NewApplicationPage from '../../pages/NewApplicationPage';
import ApplicationPage from '../../pages/ApplicationPage';
import KnowledgePage from '../../pages/KnowledgePage';
import KnowledgeEntryPage from '../../pages/KnowledgeEntryPage';
import CvTemplatesPage from '../../pages/CvTemplatesPage';
import CompanyPage from '../../pages/CompanyPage';
import CompaniesPage from '../../pages/CompaniesPage';
import NewCompanyPage from '../../pages/NewCompanyPage';
import StatisticsPage from '../../pages/StatisticsPage';
import SettingsPage from '../../pages/SettingsPage';
import PlatformUsersPage from '../../pages/PlatformUsersPage';

function AdminRoute() {
  const { user } = useAuth();
  if (user?.platformRole !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const [moreAnchorEl, setMoreAnchorEl] = useState<HTMLElement | null>(null);

  const navItems = [
    { label: t('nav.home'), value: '/', icon: <HomeIcon /> },
    { label: t('nav.pipeline'), value: '/pipeline', icon: <ViewKanbanIcon /> },
    { label: t('nav.knowledge'), value: '/knowledge', icon: <PsychologyIcon /> },
    { label: t('nav.cvTemplates'), value: '/cv', icon: <DescriptionIcon /> },
    { label: t('nav.more'), value: 'more', icon: <MoreHorizIcon /> },
  ];

  const currentNav =
    navItems.find((item) => item.value !== 'more' && location.pathname.startsWith(item.value) && item.value !== '/')
      ?.value ||
    (location.pathname === '/' ? '/' : 'more');

  const isKnowledgePage = location.pathname.startsWith('/knowledge');
  const isCompaniesPage = location.pathname.startsWith('/companies');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', pb: 10 }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            fontWeight={700}
            sx={{
              flexGrow: 1,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {t('common.appName')}
          </Typography>
          <LanguageSwitcher />
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, px: 2, py: 2, maxWidth: 720, mx: 'auto', width: '100%' }}>
        <PageTransition>
          {(displayLocation) => (
            <Routes location={displayLocation}>
              <Route index element={<HomePage />} />
              <Route path="pipeline" element={<PipelinePage />} />
              <Route path="new" element={<NewApplicationPage />} />
              <Route path="applications/:id" element={<ApplicationPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="knowledge/:id" element={<KnowledgeEntryPage />} />
              <Route path="cv" element={<CvTemplatesPage />} />
              <Route path="companies" element={<CompaniesPage />} />
              <Route path="companies/new" element={<NewCompanyPage />} />
              <Route path="companies/:id" element={<CompanyPage />} />
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route element={<AdminRoute />}>
                <Route path="platform/users" element={<PlatformUsersPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </PageTransition>
      </Box>

      {!isKnowledgePage && !isCompaniesPage && (
        <Fab
          variant="extended"
          color="secondary"
          aria-label={t('nav.newJobPosting')}
          sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1100 }}
          onClick={() => navigate('/new')}
        >
          <AddIcon sx={{ mr: 1 }} />
          {t('nav.newJobPosting')}
        </Fab>
      )}

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={8}>
        <BottomNavigation
          showLabels
          value={currentNav}
          onChange={(_, value) => {
            if (value !== 'more') navigate(value);
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction
              key={item.value}
              label={item.label}
              value={item.value}
              icon={item.icon}
              onClick={
                item.value === 'more'
                  ? (e) => setMoreAnchorEl(e.currentTarget)
                  : undefined
              }
            />
          ))}
        </BottomNavigation>
      </Paper>

      <MoreMenu
        anchorEl={moreAnchorEl}
        open={Boolean(moreAnchorEl)}
        onClose={() => setMoreAnchorEl(null)}
      />
    </Box>
  );
}
