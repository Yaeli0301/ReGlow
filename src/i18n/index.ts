import { he, type TranslationSchema } from "./locales/he";
import { en } from "./locales/en";

export type Locale = "he" | "en";

export const LOCALES: Locale[] = ["he", "en"];
export const DEFAULT_LOCALE: Locale = "he";

const dictionaries: Record<Locale, TranslationSchema> = { he, en: en as TranslationSchema };

export function getDictionary(locale: Locale): TranslationSchema {
  return dictionaries[locale] ?? he;
}

export function isRtl(locale: Locale): boolean {
  return locale === "he";
}

export function getLocaleDir(locale: Locale): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** Dot-path lookup: t(dict, "nav.dashboard") */
export function translate(
  dict: TranslationSchema,
  key: string,
  params?: Record<string, string | number>
): string {
  const parts = key.split(".");
  let value: unknown = dict;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  if (typeof value !== "string") return key;
  if (!params) return value;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    value
  );
}

export type { TranslationSchema };
