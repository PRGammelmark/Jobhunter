import type { ReactNode } from 'react';
import { cn } from './cn';

interface Props {
  icon: ReactNode;
  iconClassName?: string;
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
}

export default function StatCard({
  icon,
  iconClassName,
  value,
  label,
  hint,
  onClick,
}: Props) {
  const content = (
    <>
      <div
        className={cn(
          'mb-3 inline-flex h-10 w-10 items-center justify-center rounded-[12px]',
          iconClassName ?? 'bg-brand-soft text-brand'
        )}
      >
        {icon}
      </div>
      <div className="text-[28px] font-bold leading-none tracking-tight text-ink">{value}</div>
      <div className="mt-1.5 text-sm font-medium text-ink-secondary">{label}</div>
      {hint && <div className="mt-2 text-xs font-semibold text-success">{hint}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="app-card app-card-interactive p-4 text-left"
      >
        {content}
      </button>
    );
  }

  return <div className="app-card p-4">{content}</div>;
}
