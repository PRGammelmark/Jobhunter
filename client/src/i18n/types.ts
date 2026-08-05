export type AppLocale = 'da' | 'en';

export const APP_LOCALES: AppLocale[] = ['da', 'en'];

export const LOCALE_STORAGE_KEY = 'jobhunter.locale';

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'da' || value === 'en';
}

export function localeDateTag(locale: AppLocale): string {
  return locale === 'en' ? 'en-GB' : 'da-DK';
}
