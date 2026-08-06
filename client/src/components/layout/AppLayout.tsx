import { Link, Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Brain,
  BriefcaseBusiness,
  ChartColumn,
  FileText,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Settings,
  Building2,
  Users,
  LogOut,
} from 'lucide-react';
import { useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark, Button, cn, IconButton } from '../../ui';
import LanguageSwitcher from './LanguageSwitcher';
import MoreMenu from './MoreMenu';
import { PageMetaProvider, usePageMeta } from './PageMetaContext';
import PageTransition, { PageTransitionProvider, usePageTransition } from './PageTransition';
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

function userInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function DesktopTopBar() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { meta } = usePageMeta();
  const { style, onTransitionEnd } = usePageTransition();

  return (
    <header className="sticky top-0 z-30 hidden bg-canvas/90 px-8 py-4 backdrop-blur-md lg:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <div
          className="min-w-0 motion-reduce:transition-none"
          style={style}
          onTransitionEnd={onTransitionEnd}
        >
          {meta.title ? (
            <>
              <h1 className="truncate text-[28px] font-bold tracking-tight text-ink leading-tight">
                {meta.title}
              </h1>
              {meta.subtitle && (
                <p className="mt-1 text-[15px] text-ink-secondary">{meta.subtitle}</p>
              )}
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start">
          <Button
            leftIcon={<Plus size={18} strokeWidth={2.25} />}
            onClick={() => navigate('/new')}
          >
            {t('nav.newJobPosting')}
          </Button>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

export default function AppLayout() {
  return (
    <PageMetaProvider>
      <PageTransitionProvider>
        <AppLayoutInner />
      </PageTransitionProvider>
    </PageMetaProvider>
  );
}

function AppLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLocale();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const mobileNav = [
    { label: t('nav.home'), value: '/', icon: Home },
    { label: t('nav.pipeline'), value: '/pipeline', icon: BriefcaseBusiness },
    { label: t('nav.knowledge'), value: '/knowledge', icon: Brain },
    { label: t('nav.more'), value: 'more', icon: MoreHorizontal },
  ];

  const desktopNav = [
    { label: t('nav.home'), value: '/', icon: Home },
    { label: t('nav.pipeline'), value: '/pipeline', icon: LayoutGrid },
    { label: t('nav.knowledge'), value: '/knowledge', icon: Brain },
    { label: t('nav.cvTemplates'), value: '/cv', icon: FileText },
    { label: t('nav.companies'), value: '/companies', icon: Building2 },
    { label: t('nav.statistics'), value: '/statistics', icon: ChartColumn },
    { label: t('nav.settings'), value: '/settings', icon: Settings },
    ...(user?.platformRole === 'admin'
      ? [{ label: t('nav.users'), value: '/platform/users', icon: Users }]
      : []),
  ];

  const pathActive = (value: string) => {
    if (value === '/') return location.pathname === '/';
    return location.pathname.startsWith(value);
  };

  const currentMobile =
    mobileNav.find((item) => item.value !== 'more' && pathActive(item.value))?.value ||
    (location.pathname === '/' ? '/' : 'more');

  const isKnowledgePage = location.pathname.startsWith('/knowledge');
  const isCompaniesPage = location.pathname.startsWith('/companies');
  const hideMobileFab = isKnowledgePage || isCompaniesPage;

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-canvas lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link to="/" className="mb-8 px-1">
          <BrandMark />
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {desktopNav.map((item) => {
            const Icon = item.icon;
            const active = pathActive(item.value);
            return (
              <Link
                key={item.value}
                to={item.value}
                className={cn(
                  'flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-colors',
                  active
                    ? 'bg-brand-soft text-brand'
                    : 'text-ink-secondary hover:bg-canvas hover:text-ink'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {userInitials(user?.name)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{user?.name}</div>
              <div className="truncate text-xs text-ink-secondary">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-canvas hover:text-ink"
          >
            <LogOut size={18} strokeWidth={1.75} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <Link to="/">
              <BrandMark />
            </Link>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                {userInitials(user?.name)}
              </div>
            </div>
          </div>
        </header>

        <DesktopTopBar />

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 lg:max-w-6xl lg:px-8 lg:py-6">
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
        </main>
      </div>

      {/* Mobile bottom nav + center FAB */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="relative mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 items-end">
          {mobileNav.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = currentMobile === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => navigate(item.value)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 pb-2 pt-2 text-[11px] font-semibold',
                  active ? 'text-brand' : 'text-ink-muted'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </button>
            );
          })}

          <div className="relative flex justify-center">
            {!hideMobileFab && (
              <IconButton
                label={t('nav.newJobPosting')}
                onClick={() => navigate('/new')}
                className="-mt-7 h-14 w-14 rounded-full bg-brand text-white shadow-[var(--shadow-fab)] hover:bg-brand-hover hover:text-white"
              >
                <Plus size={26} strokeWidth={2.5} />
              </IconButton>
            )}
          </div>

          {mobileNav.slice(2).map((item) => {
            const Icon = item.icon;
            const active = currentMobile === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  if (item.value === 'more') setMoreOpen(true);
                  else navigate(item.value);
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 pb-2 pt-2 text-[11px] font-semibold',
                  active ? 'text-brand' : 'text-ink-muted'
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
