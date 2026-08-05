import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
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

export default function App() {
  return (
    <Routes>
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
      </Route>
    </Routes>
  );
}
