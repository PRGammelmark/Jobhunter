import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@career-intelligence/shared';
import { useLocale } from '../../i18n';
import { Badge, type BadgeTone, cn } from '../../ui';

const STATUS_TONES: Record<ApplicationStatus, BadgeTone> = {
  not_started: 'neutral',
  in_progress: 'info',
  ready_for_review: 'warning',
  ready_to_send: 'brand',
  sent: 'brand',
  interview: 'success',
  rejected: 'danger',
  offer: 'success',
  hired: 'success',
};

interface Props {
  status: ApplicationStatus;
  onChange?: (status: ApplicationStatus) => void;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, onChange, size = 'small' }: Props) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectable = !!onChange;
  const medium = size === 'medium';

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={!selectable}
        onClick={(e) => {
          e.stopPropagation();
          if (selectable) setOpen((v) => !v);
        }}
        className={cn(
          'inline-flex items-center',
          selectable ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        <Badge
          tone={STATUS_TONES[status]}
          className={cn(
            selectable && (medium ? 'pr-2' : 'pr-1.5'),
            medium && 'px-3 py-1.5 text-sm'
          )}
        >
          {t(`status.${status}`)}
          {selectable && (
            <ChevronDown size={medium ? 16 : 14} className="ml-0.5 opacity-80" />
          )}
        </Badge>
      </button>
      {selectable && open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-[14px] border border-line bg-surface py-1 shadow-soft"
          onClick={(e) => e.stopPropagation()}
        >
          {APPLICATION_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitem"
              className={cn(
                'flex w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-canvas',
                s === status ? 'font-semibold text-brand' : 'text-ink'
              )}
              onClick={() => {
                setOpen(false);
                if (s !== status) onChange?.(s);
              }}
            >
              {t(`status.${s}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
