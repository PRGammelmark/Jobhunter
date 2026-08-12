import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, Users } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../i18n';
import { useEmailStatus } from '../../queries';
import { cn } from '../../ui';

const MENU_ANIM_MS = 200;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function userInitials(name?: string) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function emailProviderLabel(provider: string | null | undefined) {
  if (provider === 'gmail' || provider === 'google') return 'Gmail';
  if (provider === 'outlook' || provider === 'microsoft') return 'Outlook';
  return provider || '';
}

export function AccountSummary({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const { t } = useLocale();
  const { data: emailStatus } = useEmailStatus();

  const roleLabel =
    user?.platformRole === 'admin' ? t('account.roleAdmin') : t('account.roleUser');

  const emailLine =
    emailStatus?.connected && emailStatus.provider
      ? t('account.emailConnected', { provider: emailProviderLabel(emailStatus.provider) })
      : t('account.emailNotConnected');

  return (
    <div className={cn('flex items-start gap-3', compact ? 'px-4 py-3' : 'px-4 py-4')}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold text-brand',
          compact ? 'h-10 w-10 text-sm' : 'h-11 w-11 text-sm'
        )}
      >
        {userInitials(user?.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{user?.name}</div>
        <div className="truncate text-xs text-ink-secondary">{user?.email}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-md bg-canvas px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">
            {t('account.role')}: {roleLabel}
          </span>
        </div>
        <p className="mt-1.5 truncate text-[11px] text-ink-muted">{emailLine}</p>
        {emailStatus?.connected && emailStatus.connectedEmail && (
          <p className="truncate text-[11px] text-ink-muted">{emailStatus.connectedEmail}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  triggerRef?: RefObject<HTMLElement | null>;
}

export default function AccountMenu({ open, onClose, triggerRef }: Props) {
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
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose, triggerRef]);

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
    { label: t('nav.settings'), icon: Settings, onClick: () => go('/settings') },
    ...(user?.platformRole === 'admin'
      ? [{ label: t('nav.users'), icon: Users, onClick: () => go('/platform/users') }]
      : []),
    { label: t('nav.logout'), icon: LogOut, onClick: () => void onLogout(), danger: true },
  ];

  const triggerRect = triggerRef?.current?.getBoundingClientRect();
  const panelStyle: CSSProperties = {
    transitionDuration: `${MENU_ANIM_MS}ms`,
    width: 'min(18.5rem, calc(100vw - 2rem))',
  };
  if (triggerRect) {
    panelStyle.left = triggerRect.left;
    panelStyle.bottom = window.innerHeight - triggerRect.top + 8;
    panelStyle.width = Math.max(triggerRect.width, 260);
  } else {
    panelStyle.left = 16;
    panelStyle.bottom = 16;
  }

  return (
    <div className="fixed inset-0 z-[1200]">
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-ink/10 transition-opacity ease-out motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDuration: `${MENU_ANIM_MS}ms` }}
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label={t('account.menuAria')}
        className={cn(
          'absolute overflow-hidden rounded-[18px] border border-line bg-surface shadow-soft transition-[opacity,transform] ease-out motion-reduce:transition-none',
          visible
            ? 'translate-y-0 scale-100 opacity-100'
            : 'translate-y-2 scale-[0.97] opacity-0'
        )}
        style={panelStyle}
      >
        <AccountSummary />
        <div className="border-t border-line">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-canvas',
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
    </div>
  );
}
