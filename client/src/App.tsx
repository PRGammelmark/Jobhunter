import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import AppLayout from './components/layout/AppLayout';
import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';

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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
