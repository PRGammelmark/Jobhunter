import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  children: ReactNode;
}

export default function FilterChip({
  active,
  count,
  children,
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink',
        className
      )}
      {...props}
    >
      <span>{children}</span>
      {typeof count === 'number' && count > 0 && (
        <span
          className={cn(
            'inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-bold leading-[18px]',
            active ? 'bg-white/20 text-white' : 'bg-canvas text-ink-secondary'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
