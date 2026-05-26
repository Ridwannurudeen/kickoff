"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

const STORAGE_KEY = "kickoff.locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Hydrate from localStorage on the client (avoid SSR mismatch by reading
  // after first paint and re-rendering).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
        setLocaleState(stored);
      }
    } catch {
      // localStorage is best-effort; ignore failures.
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Outside provider — fall back to English so isolated components still
    // render (e.g., loading the layout shell before Providers wraps).
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key: TranslationKey, vars?: Record<string, string | number>) =>
        translate(DEFAULT_LOCALE, key, vars),
    } satisfies I18nContextValue;
  }
  return ctx;
}
