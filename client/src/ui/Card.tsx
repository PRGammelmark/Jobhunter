import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  interactive,
  padding = 'md',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'app-card',
        paddings[padding],
        interactive && 'app-card-interactive',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function CardButton({
  padding = 'md',
  className,
  children,
  type = 'button',
  ...props
}: CardButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'app-card app-card-interactive w-full text-left',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}
