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
  getDictionary,
  getLocaleDir,
  translate,
  type Locale,
  type TranslationSchema,
} from "@/i18n";

const COOKIE_NAME = "reglow_locale";
const STORAGE_KEY = "reglow_locale";

type LanguageContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  dict: TranslationSchema;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage === "he" || fromStorage === "en") return fromStorage;
  const match = document.cookie.match(new RegExp(`${COOKIE_NAME}=(he|en)`));
  if (match?.[1] === "he" || match?.[1] === "en") return match[1];
  return DEFAULT_LOCALE;
}

function persistLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

function applyDocumentLocale(locale: Locale) {
  const dir = getLocaleDir(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLocaleState(stored);
    applyDocumentLocale(stored);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    applyDocumentLocale(next);
  }, []);

  const dict = useMemo(() => getDictionary(locale), [locale]);
  const dir = getLocaleDir(locale);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(dict, key, params),
    [dict]
  );

  const value = useMemo(
    () => ({ locale, dir, dict, setLocale, t }),
    [locale, dir, dict, setLocale, t]
  );

  if (!ready) {
    return (
      <LanguageContext.Provider value={value}>
        <div dir={dir} className="min-h-screen opacity-0">
          {children}
        </div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      <div dir={dir}>{children}</div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useT() {
  return useLanguage().t;
}
