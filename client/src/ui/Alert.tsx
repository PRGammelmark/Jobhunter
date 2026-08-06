import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'error' | 'info' | 'success' | 'warning';

const tones: Record<Tone, string> = {
  error: 'bg-danger-soft text-danger border-danger/15',
  info: 'bg-info-soft text-info border-info/15',
  success: 'bg-success-soft text-success border-success/15',
  warning: 'bg-warning-soft text-warning border-warning/15',
};

export default function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-[14px] border px-3.5 py-3 text-sm font-medium',
        tones[tone],
        className
      )}
      role="alert"
    >
      {children}
    </div>
  );
}
