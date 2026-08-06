import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-canvas text-ink-secondary',
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export default function Badge({ tone = 'neutral', className, ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
