import { ChevronRight } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { useLocale } from '../../i18n';
import { cn } from '../../ui';

export type Crumb = {
  label: string;
  to?: string;
};

type Props = {
  items: Crumb[];
};

export default function PageBreadcrumbs({ items }: Props) {
  const { t } = useLocale();
  const crumbs = items.filter((item) => item.label.trim());
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label={t('breadcrumbs.aria')} className="mb-2 min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-ink-secondary">
        {crumbs.map((item, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight size={14} className="shrink-0 text-ink-muted" />}
              {isLast || !item.to ? (
                <span className="truncate max-w-[160px] sm:max-w-[240px]">{item.label}</span>
              ) : (
                <RouterLink
                  to={item.to}
                  className={cn(
                    'truncate max-w-[140px] sm:max-w-[200px] hover:text-brand transition-colors'
                  )}
                >
                  {item.label}
                </RouterLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
