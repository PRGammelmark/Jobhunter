import { useEffect, type ReactNode } from 'react';
import { usePageMeta } from '../components/layout/PageMetaContext';
import { cn } from './cn';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, action, className }: Props) {
  const { setMeta } = usePageMeta();

  useEffect(() => {
    setMeta({ title, subtitle });
  }, [title, subtitle, setMeta]);

  useEffect(() => {
    return () => setMeta({});
  }, [setMeta]);

  return (
    <>
      <div
        className={cn(
          'mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between lg:hidden',
          className
        )}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {action && (
        <div className={cn('mb-4 hidden justify-end lg:flex', className)}>{action}</div>
      )}
    </>
  );
}
