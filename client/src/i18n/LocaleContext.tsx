import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import { keys } from '../queries/keys';
import { da } from './messages/da';
import { en } from './messages/en';
import { translate, type TranslateParams } from './translate';
import {
  isAppLocale,
  localeDateTag,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from './types';
import type { Settings } from '@career-intelligence/shared';

const MESSAGES = { da, en } as const;

function readStoredLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isAppLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return 'da';
}

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, params?: TranslateParams) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());
  const userPickedRef = useRef(false);

  const persistLocale = useCallback(async (next: AppLocale, syncSettings: boolean) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    if (!syncSettings || !user) return;
    try {
      const settings = await queryClient.fetchQuery({
        queryKey: keys.settings,
        queryFn: () => api.getSettings(),
      });
      const updated = await api.updateSettings({
        ...settings,
        preferences: {
          ...settings.preferences,
          defaultLanguage: next,
          aiModel: settings.preferences?.aiModel || 'gpt-4o-mini',
        },
      });
      queryClient.setQueryData<Settings>(keys.settings, updated);
    } catch {
      /* ignore — UI language still updates locally */
    }
  }, [user, queryClient]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        if (userPickedRef.current) {
          await persistLocale(readStoredLocale(), true);
          return;
        }
        const settings = await queryClient.fetchQuery({
          queryKey: keys.settings,
          queryFn: () => api.getSettings(),
        });
        const fromSettings = settings.preferences?.defaultLanguage;
        if (!cancelled && isAppLocale(fromSettings)) {
          setLocaleState(fromSettings);
          try {
            localStorage.setItem(LOCALE_STORAGE_KEY, fromSettings);
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id, persistLocale, queryClient]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      if (next === locale) return;
      userPickedRef.current = true;
      void persistLocale(next, true);
    },
    [locale, persistLocale]
  );

  const t = useCallback(
    (key: string, params?: TranslateParams) => translate(MESSAGES[locale], key, params),
    [locale]
  );

  const formatDate = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      new Date(value).toLocaleDateString(localeDateTag(locale), options),
    [locale]
  );

  const formatDateTime = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      new Date(value).toLocaleString(localeDateTag(locale), options),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, formatDate, formatDateTime }),
    [locale, setLocale, t, formatDate, formatDateTime]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
