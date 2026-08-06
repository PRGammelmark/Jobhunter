import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChartColumn,
  FileText,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n';
import { cn } from '../../ui';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function MoreMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLocale();
  const panelRef = useRef<HTMLDivElement>(null);

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

  if (!open) return null;

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
    { label: t('nav.cvTemplates'), icon: FileText, onClick: () => go('/cv') },
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
      <button type="button" className="absolute inset-0 bg-ink/20" aria-label={t('common.close')} onClick={onClose} />
      <div
        ref={panelRef}
        role="menu"
        className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 left-3 mx-auto max-w-sm overflow-hidden rounded-[18px] border border-line bg-surface shadow-soft sm:left-auto sm:right-4 sm:w-64 lg:bottom-auto lg:top-20 lg:right-auto lg:left-4"
      >
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
