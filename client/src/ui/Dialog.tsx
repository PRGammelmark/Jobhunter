import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import IconButton from './IconButton';
import { cn } from './cn';

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function Dialog({ open, onClose, title, children, actions, className }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full max-w-md rounded-t-[22px] bg-surface p-5 shadow-soft sm:rounded-[22px]',
          className
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose} className="-mr-1 -mt-1">
            <X size={18} />
          </IconButton>
        </div>
        <div className="text-sm text-ink-secondary">{children}</div>
        {actions && <div className="mt-5 flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function DialogCancelButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button variant="secondary" onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}
