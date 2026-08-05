import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Fab,
  Skeleton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { api } from '../services/api';
import type { Company } from '@career-intelligence/shared';
import { useLocale } from '../i18n';

export default function CompaniesPage() {
  const navigate = useNavigate();
  const { t, formatDate } = useLocale();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCompanies().then(setCompanies).finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ pb: 10 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>{t('companies.title')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('companies.subtitle')}
      </Typography>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />)
      ) : companies.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('companies.empty')}
        </Typography>
      ) : (
        companies.map((company) => (
          <Card key={company._id} sx={{ mb: 1.5 }}>
            <CardActionArea onClick={() => navigate(`/companies/${company._id}`)}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <BusinessIcon color="action" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {company.name}
                    </Typography>
                  </Box>
                  {company.industry && <Chip label={company.industry} size="small" />}
                </Box>
                {company.description && (
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
                    {company.description}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {company.applicationIds.length === 0
                    ? t('companies.noJobs')
                    : t('companies.jobsCount', { count: company.applicationIds.length })}
                  {' · '}
                  {t('companies.lastActivity', { date: formatDate(company.lastActivityAt) })}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))
      )}

      <Fab
        variant="extended"
        color="primary"
        aria-label={t('companies.newCompanyAria')}
        sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1100 }}
        onClick={() => navigate('/companies/new')}
      >
        <AddIcon sx={{ mr: 1 }} />
        {t('companies.newCompany')}
      </Fab>
    </Box>
  );
}
