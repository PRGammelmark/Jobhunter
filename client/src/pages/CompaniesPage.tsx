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

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCompanies().then(setCompanies).finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ pb: 10 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Virksomheder</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Virksomheder du følger — med eller uden stillingsopslag.
      </Typography>

      {loading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />)
      ) : companies.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Ingen virksomheder endnu. Opret en for at komme i gang.
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
                    ? 'Ingen stillingsopslag'
                    : `${company.applicationIds.length} stillingsopslag`}
                  {' · '}
                  Seneste aktivitet: {new Date(company.lastActivityAt).toLocaleDateString('da-DK')}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))
      )}

      <Fab
        variant="extended"
        color="primary"
        aria-label="Ny virksomhed"
        sx={{ position: 'fixed', bottom: 80, right: 16, zIndex: 1100 }}
        onClick={() => navigate('/companies/new')}
      >
        <AddIcon sx={{ mr: 1 }} />
        Ny virksomhed
      </Fab>
    </Box>
  );
}
