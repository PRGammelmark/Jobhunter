import { Breadcrumbs, Link, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link as RouterLink } from 'react-router-dom';
import { useLocale } from '../../i18n';

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
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
      aria-label={t('breadcrumbs.aria')}
      sx={{
        mb: 0.5,
        minWidth: 0,
        '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap', rowGap: 0.25 },
        '& .MuiBreadcrumbs-li': { minWidth: 0, display: 'flex' },
      }}
    >
      {crumbs.map((item, index) => {
        const isLast = index === crumbs.length - 1;
        if (isLast || !item.to) {
          return (
            <Typography
              key={`${item.label}-${index}`}
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ maxWidth: { xs: 160, sm: 240 } }}
            >
              {item.label}
            </Typography>
          );
        }

        return (
          <Link
            key={`${item.label}-${index}`}
            component={RouterLink}
            to={item.to}
            underline="hover"
            color="text.secondary"
            variant="body2"
            noWrap
            sx={{ maxWidth: { xs: 140, sm: 200 } }}
          >
            {item.label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}
