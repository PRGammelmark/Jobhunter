import { Link, Navigate, Outlet, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  BriefcaseBusiness,
  ChartColumn,
  ChevronLeft,
  ChevronUp,
  FileText,
  Home,
  LayoutGrid,
  LayoutTemplate,
  Lightbulb,
  MoreHorizontal,
  Plus,
  Settings,
  Building2,
  Users,
} from 'lucide-react';
import { useLocale } from '../../i18n';
import { useAuth } from '../../auth/AuthContext';
import { BrandMark, Button, cn, IconButton } from '../../ui';
import AccountMenu, { userInitials } from './AccountMenu';
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
import CvDocumentsPage from '../../pages/CvDocumentsPage';
import TemplatesPage from '../../pages/TemplatesPage';
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
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);

  const mobileNav = [
    { label: t('nav.home'), value: '/', icon: Home },
    { label: t('nav.pipeline'), value: '/pipeline', icon: BriefcaseBusiness },
    { label: t('nav.templates'), value: '/templates', icon: LayoutTemplate },
    { label: t('nav.more'), value: 'more', icon: MoreHorizontal },
  ];

  const desktopNav = [
    { label: t('nav.home'), value: '/', icon: Home },
    { label: t('nav.pipeline'), value: '/pipeline', icon: LayoutGrid },
    { label: t('nav.knowledge'), value: '/knowledge', icon: Lightbulb },
    { label: t('nav.cvDocuments'), value: '/cv', icon: FileText },
    { label: t('nav.templates'), value: '/templates', icon: LayoutTemplate },
    { label: t('nav.companies'), value: '/companies', icon: Building2 },
    { label: t('nav.statistics'), value: '/statistics', icon: ChartColumn },
    { label: t('nav.settings'), value: '/settings', icon: Settings },
  ];

  const platformAdminNav =
    user?.platformRole === 'admin'
      ? [{ label: t('nav.users'), value: '/platform/users', icon: Users }]
      : [];

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
  const mobileRootPaths = new Set(['/', '/pipeline', '/templates']);
  const showMobileBack = !mobileRootPaths.has(location.pathname);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.search]);

  const onMobileBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    if (location.pathname.startsWith('/applications') || location.pathname === '/new') {
      navigate('/pipeline');
      return;
    }
    if (location.pathname.startsWith('/knowledge/')) {
      navigate('/knowledge');
      return;
    }
    if (location.pathname.startsWith('/companies/') || location.pathname === '/companies/new') {
      navigate('/companies');
      return;
    }
    navigate('/');
  };

  const mobileNavButtonClass = (active: boolean) =>
    cn(
      'flex min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pb-1 pt-1.5 text-[11px] font-semibold',
      active ? 'text-brand' : 'text-ink-muted'
    );

  return (
    <div className="bg-canvas max-lg:flex max-lg:h-dvh max-lg:flex-col max-lg:overflow-hidden lg:flex lg:min-h-dvh">
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

          {platformAdminNav.length > 0 && (
            <>
              <div className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                {t('nav.platformAdmin')}
              </div>
              {platformAdminNav.map((item) => {
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
            </>
          )}
        </nav>

        <div className="mt-4 border-t border-line pt-4">
          <button
            ref={accountTriggerRef}
            type="button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            aria-label={t('account.menuAria')}
            className={cn(
              'flex w-full items-center gap-3 rounded-[14px] px-1 py-1.5 text-left transition-colors hover:bg-canvas',
              accountOpen && 'bg-canvas'
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {userInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink">{user?.name}</div>
              <div className="truncate text-xs text-ink-secondary">{user?.email}</div>
            </div>
            <ChevronUp
              size={16}
              strokeWidth={2}
              className={cn(
                'mr-1 shrink-0 text-ink-muted transition-transform',
                accountOpen && 'rotate-180'
              )}
            />
          </button>
        </div>
      </aside>

      <AccountMenu
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        triggerRef={accountTriggerRef}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile top bar — fixed to viewport */}
        <header className="fixed inset-x-0 top-0 z-40 border-b border-line/80 bg-surface/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md lg:hidden">
          <div className="relative mx-auto flex h-14 max-w-3xl items-center">
            <div className="z-10 flex w-12 shrink-0 items-center justify-start">
              {showMobileBack && (
                <IconButton
                  label={t('nav.back')}
                  onClick={onMobileBack}
                  className="-ml-2 h-10 w-10"
                >
                  <ChevronLeft size={24} strokeWidth={2.25} />
                </IconButton>
              )}
            </div>
            <Link
              to="/"
              className="absolute inset-x-0 flex justify-center pointer-events-none"
            >
              <span className="pointer-events-auto">
                <BrandMark />
              </span>
            </Link>
            <div className="ml-auto w-12 shrink-0" aria-hidden />
          </div>
        </header>
        <div
          className="shrink-0 lg:hidden"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}
          aria-hidden
        />

        <DesktopTopBar />

        <main
          ref={mainRef}
          className="mx-auto w-full min-w-0 max-w-3xl flex-1 px-4 py-4 max-lg:min-h-0 max-lg:overflow-x-clip max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:max-w-6xl lg:px-8 lg:py-6"
        >
          <PageTransition>
            {(displayLocation) => (
              <Routes location={displayLocation}>
                <Route index element={<HomePage />} />
                <Route path="pipeline" element={<PipelinePage />} />
                <Route path="new" element={<NewApplicationPage />} />
                <Route path="applications/:id" element={<ApplicationPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="knowledge/:id" element={<KnowledgeEntryPage />} />
                <Route path="cv" element={<CvDocumentsPage />} />
                <Route path="templates" element={<TemplatesPage />} />
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

      {/* Mobile bottom nav + center FAB — fixed to viewport */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface/95 px-2 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md lg:hidden">
        <div className="relative mx-auto grid h-14 max-w-lg grid-cols-5 items-end">
          {mobileNav.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = currentMobile === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => navigate(item.value)}
                className={mobileNavButtonClass(active)}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="relative flex justify-center pb-1">
            {!hideMobileFab && (
              <IconButton
                label={t('nav.newJobPosting')}
                onClick={() => navigate('/new')}
                className="-mt-9 h-16 w-16 rounded-full bg-brand text-white shadow-[var(--shadow-fab)] hover:bg-brand-hover hover:text-white"
              >
                <Plus size={30} strokeWidth={2.5} />
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
                className={mobileNavButtonClass(active)}
              >
                <Icon size={22} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
