import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChartColumn,
  FileText,
  Lightbulb,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n';
import { cn } from '../../ui';
import LanguageSwitcher from './LanguageSwitcher';

const MENU_ANIM_MS = 200;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MoreMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);
  const enterFrameRef = useRef(0);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      if (prefersReducedMotion()) {
        setVisible(true);
        return;
      }
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = requestAnimationFrame(() => {
        enterFrameRef.current = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
      return () => cancelAnimationFrame(enterFrameRef.current);
    }

    setVisible(false);
    if (prefersReducedMotion()) {
      setRendered(false);
      return;
    }
    const timer = window.setTimeout(() => setRendered(false), MENU_ANIM_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => () => cancelAnimationFrame(enterFrameRef.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose]);

  if (!rendered) return null;

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  const onLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const items = [
    { label: t('nav.knowledge'), icon: Lightbulb, onClick: () => go('/knowledge') },
    { label: t('nav.cvDocuments'), icon: FileText, onClick: () => go('/cv') },
    { label: t('nav.companies'), icon: Building2, onClick: () => go('/companies') },
    { label: t('nav.statistics'), icon: ChartColumn, onClick: () => go('/statistics') },
    { label: t('nav.settings'), icon: Settings, onClick: () => go('/settings') },
    ...(user?.platformRole === 'admin'
      ? [{ label: t('nav.users'), icon: Users, onClick: () => go('/platform/users') }]
      : []),
    { label: t('nav.logout'), icon: LogOut, onClick: () => void onLogout(), danger: true },
  ];

  return (
    <div className="fixed inset-0 z-[1200]">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-ink/20 transition-opacity ease-out motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: `${MENU_ANIM_MS}ms` }}
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="menu"
        className={cn(
          'absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 left-3 mx-auto max-w-sm overflow-hidden rounded-[18px] border border-line bg-surface shadow-soft transition-[opacity,transform] ease-out motion-reduce:transition-none sm:left-auto sm:right-4 sm:w-64 lg:bottom-auto lg:top-20 lg:right-auto lg:left-4',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-3 scale-[0.97] opacity-0 lg:-translate-y-2'
        )}
        style={{ transitionDuration: `${MENU_ANIM_MS}ms` }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="text-sm font-medium text-ink-secondary">{t('settings.language')}</span>
          <LanguageSwitcher />
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={item.onClick}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors hover:bg-canvas',
                item.danger ? 'text-danger' : 'text-ink'
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
