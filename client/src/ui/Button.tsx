import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover shadow-[0_6px_16px_rgb(255_87_34_/_0.28)] disabled:bg-brand-muted',
  secondary:
    'bg-surface text-ink border border-line hover:border-line-strong hover:bg-canvas',
  ghost: 'bg-transparent text-ink-secondary hover:bg-canvas hover:text-ink',
  danger: 'bg-danger text-white hover:opacity-90',
  soft: 'bg-brand-soft text-brand hover:bg-brand-muted/60',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-[12px]',
  md: 'h-11 px-4 text-sm gap-2 rounded-[14px]',
  lg: 'h-12 px-5 text-[15px] gap-2 rounded-[16px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
