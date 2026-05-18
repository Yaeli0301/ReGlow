"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { Locale } from "@/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  function select(next: Locale) {
    if (next !== locale) setLocale(next);
  }

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl border border-brand-100 bg-white/90 p-1 text-sm shadow-sm ${className}`}
      role="group"
      aria-label={t("language.label")}
    >
      <button
        type="button"
        onClick={() => select("he")}
        className={`rounded-lg px-3 py-1.5 font-medium transition ${
          locale === "he" ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 hover:bg-brand-50"
        }`}
      >
        {t("language.he")}
      </button>
      <button
        type="button"
        onClick={() => select("en")}
        className={`rounded-lg px-3 py-1.5 font-medium transition ${
          locale === "en" ? "bg-brand-500 text-white shadow-sm" : "text-gray-600 hover:bg-brand-50"
        }`}
      >
        {t("language.en")}
      </button>
    </div>
  );
}
