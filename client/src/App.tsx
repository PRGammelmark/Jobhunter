import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './auth/AuthContext';
import HomePage from './pages/HomePage';
import PipelinePage from './pages/PipelinePage';
import NewApplicationPage from './pages/NewApplicationPage';
import ApplicationPage from './pages/ApplicationPage';
import KnowledgePage from './pages/KnowledgePage';
import KnowledgeEntryPage from './pages/KnowledgeEntryPage';
import CvTemplatesPage from './pages/CvTemplatesPage';
import CompanyPage from './pages/CompanyPage';
import CompaniesPage from './pages/CompaniesPage';
import NewCompanyPage from './pages/NewCompanyPage';
import StatisticsPage from './pages/StatisticsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import PlatformUsersPage from './pages/PlatformUsersPage';

function ProtectedRoute() {
  const { user, loading, setupRequired } = useAuth();
  if (loading) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AdminRoute() {
  const { user } = useAuth();
  if (user?.platformRole !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
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
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
