import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useLocale, type AppLocale } from '../../i18n';

interface Props {
  /** `onDark` for AppBar; `onLight` for login/setup pages */
  variant?: 'onDark' | 'onLight';
}

export default function LanguageSwitcher({ variant = 'onDark' }: Props) {
  const { locale, setLocale, t } = useLocale();
  const onDark = variant === 'onDark';

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={locale}
      onChange={(_, value: AppLocale | null) => {
        if (value) setLocale(value);
      }}
      aria-label={t('language.switchAria')}
      sx={
        onDark
          ? {
              bgcolor: 'rgba(255,255,255,0.12)',
              '& .MuiToggleButton-root': {
                color: 'rgba(255,255,255,0.85)',
                borderColor: 'rgba(255,255,255,0.25)',
                px: 1.25,
                py: 0.25,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'common.white',
                  '&:hover': { bgcolor: 'grey.100' },
                },
              },
            }
          : {
              bgcolor: 'action.hover',
              '& .MuiToggleButton-root': {
                color: 'text.secondary',
                borderColor: 'divider',
                px: 1.25,
                py: 0.25,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                '&.Mui-selected': {
                  color: 'primary.contrastText',
                  bgcolor: 'primary.main',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              },
            }
      }
    >
      <ToggleButton value="da">DA</ToggleButton>
      <ToggleButton value="en">EN</ToggleButton>
    </ToggleButtonGroup>
  );
}
