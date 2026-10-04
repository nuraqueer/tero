import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { getLocales } from 'expo-localization';
import { defaultLocale, matchLocale, t, type Locale, type MessageKey } from '@tero/i18n';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function deviceLocale(): Locale {
  return matchLocale(getLocales().map((l) => l.languageTag));
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // The web build is pre-rendered in the default language, so the first render must match it.
  // The device's language is applied straight after.
  const [locale, setLocale] = useState<Locale>(() =>
    Platform.OS === 'web' ? defaultLocale : deviceLocale(),
  );
  useEffect(() => {
    if (Platform.OS === 'web') setLocale(deviceLocale());
  }, []);
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key, vars) => t(locale, key, vars) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
