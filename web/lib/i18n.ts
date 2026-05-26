/**
 * Minimal in-tree i18n. English-primary; additional locales are flat
 * dictionaries that overlay the English defaults — any missing key falls
 * back to English at render time.
 *
 * Why not next-i18next: this app is small, App-Router-first, and we want
 * zero runtime cost. A flat dictionary + a tiny client provider is plenty
 * for the v1 launch surface. Additional locales can be slotted in by
 * dropping another file into `lib/locales/`.
 */

import { en } from "./locales/en";
import { es } from "./locales/es";

export const dictionaries = { en, es } as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof en;

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
];

export const DEFAULT_LOCALE: Locale = "en";

/** Pure translate function: locale + key → string, with English fallback. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let s = (dict as Record<string, string>)[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
