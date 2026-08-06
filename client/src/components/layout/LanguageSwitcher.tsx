import { useLocale, type AppLocale } from '../../i18n';
import { cn } from '../../ui';

interface Props {
  variant?: 'default' | 'onDark';
}

export default function LanguageSwitcher({ variant = 'default' }: Props) {
  const { locale, setLocale, t } = useLocale();
  const onDark = variant === 'onDark';

  return (
    <div
      role="group"
      aria-label={t('language.switchAria')}
      className={cn(
        'inline-flex rounded-full p-0.5',
        onDark ? 'bg-white/15' : 'bg-canvas border border-line'
      )}
    >
      {(['da', 'en'] as AppLocale[]).map((code) => {
        const selected = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              'h-8 min-w-10 rounded-full px-2.5 text-xs font-bold tracking-wide transition-colors',
              selected
                ? onDark
                  ? 'bg-white text-brand'
                  : 'bg-brand text-white'
                : onDark
                  ? 'text-white/80 hover:text-white'
                  : 'text-ink-secondary hover:text-ink'
            )}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
