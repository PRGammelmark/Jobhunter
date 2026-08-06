import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  tone?: 'default' | 'brand' | 'danger';
}

const tones = {
  default: 'text-ink-secondary hover:bg-canvas hover:text-ink',
  brand: 'text-brand hover:bg-brand-soft',
  danger: 'text-danger hover:bg-danger-soft',
};

export default function IconButton({
  label,
  children,
  tone = 'default',
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'touch-target inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-50',
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
