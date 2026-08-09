import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import { useLocale } from '../i18n';
import { useCompanies } from '../queries';
import { Badge, CardButton, EmptyState, IconButton, PageHeader, Skeleton } from '../ui';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { t, formatDate } = useLocale();
  const { data: companiesData, isPending } = useCompanies();
  const companies = companiesData ?? [];

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('companies.title')}
        subtitle={t('companies.subtitle')}
        action={
          <button
            type="button"
            onClick={() => navigate('/companies/new')}
            className="hidden h-11 items-center gap-2 rounded-[14px] bg-brand px-4 text-sm font-semibold text-white shadow-[0_6px_16px_rgb(255_87_34_/_0.28)] hover:bg-brand-hover sm:inline-flex"
          >
            <Plus size={18} strokeWidth={2.25} />
            {t('companies.newCompany')}
          </button>
        }
      />

      {isPending && !companiesData ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState>{t('companies.empty')}</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {companies.map((company) => (
            <CardButton key={company._id} onClick={() => navigate(`/companies/${company._id}`)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-soft text-brand">
                    <Building2 size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-ink">{company.name}</div>
                    {company.description && (
                      <div className="mt-0.5 line-clamp-1 text-sm text-ink-secondary">
                        {company.description}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-ink-muted">
                      {company.applicationIds.length === 0
                        ? t('companies.noJobs')
                        : t('companies.jobsCount', { count: company.applicationIds.length })}
                      {' · '}
                      {t('companies.lastActivity', { date: formatDate(company.lastActivityAt) })}
                    </div>
                  </div>
                </div>
                {company.industry && <Badge tone="neutral">{company.industry}</Badge>}
              </div>
            </CardButton>
          ))}
        </div>
      )}

      <IconButton
        label={t('companies.newCompanyAria')}
        onClick={() => navigate('/companies/new')}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[1100] h-14 w-14 rounded-full bg-brand text-white shadow-[var(--shadow-fab)] hover:bg-brand-hover hover:text-white lg:hidden"
      >
        <Plus size={24} strokeWidth={2.5} />
      </IconButton>
    </div>
  );
}
