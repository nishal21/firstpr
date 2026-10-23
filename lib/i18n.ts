import { en, type I18nKey } from "@/lib/i18n-en";
import { hi, ml } from "@/lib/i18n-ml-hi";
import {
  ar,
  bn,
  de,
  es,
  fr,
  id,
  ja,
  ko,
  pt,
  ru,
  ta,
  zh,
} from "@/lib/i18n-world";

export type { I18nKey } from "@/lib/i18n-en";
export { en } from "@/lib/i18n-en";

/** Supported UI languages (English default + major world languages). */
export const UI_LANGS = [
  "en",
  "ml",
  "hi",
  "ta",
  "bn",
  "es",
  "fr",
  "de",
  "pt",
  "zh",
  "ja",
  "ko",
  "ar",
  "ru",
  "id",
] as const;

export type UiLang = (typeof UI_LANGS)[number];

export const DEFAULT_UI_LANG: UiLang = "en";

export const UI_LANG_STORAGE_KEY = "firstpr-lang";

const UI_LANG_SET = new Set<string>(UI_LANGS);

/** Native name shown in the navbar button and dropdown. */
export const UI_LANG_NATIVE: Record<UiLang, string> = {
  en: "English",
  ml: "മലയാളം",
  hi: "हिन्दी",
  ta: "தமிழ்",
  bn: "বাংলা",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية",
  ru: "Русский",
  id: "Bahasa Indonesia",
};

/** CSS class for script-specific webfonts. */
export function uiLangFontClass(lang: UiLang): string | null {
  switch (lang) {
    case "ml":
      return "font-ml";
    case "hi":
      return "font-deva";
    case "ta":
      return "font-ta";
    case "bn":
      return "font-bn";
    case "zh":
      return "font-zh";
    case "ja":
      return "font-ja";
    case "ko":
      return "font-ko";
    case "ar":
      return "font-ar";
    default:
      return null;
  }
}

export const dictionaries: Record<UiLang, Record<I18nKey, string>> = {
  en: en as Record<I18nKey, string>,
  ml,
  hi,
  ta,
  bn,
  es,
  fr,
  de,
  pt,
  zh,
  ja,
  ko,
  ar,
  ru,
  id,
};

export function parseUiLang(value: string | null | undefined): UiLang {
  const v = value?.trim().toLowerCase();
  if (v && UI_LANG_SET.has(v)) return v as UiLang;
  return DEFAULT_UI_LANG;
}

export type TParams = Record<string, string | number>;

/** Look up a UI string; fall back to English; replace `{name}` params. */
export function translate(
  lang: UiLang,
  key: I18nKey,
  params?: TParams,
): string {
  const raw =
    dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? String(key);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] != null ? String(params[name]) : `{${name}}`,
  );
}

/** Map API English difficulty badge → i18n key. */
export function difficultyBadgeKey(label: string): I18nKey | null {
  const n = label.trim().toLowerCase();
  if (n === "beginner-friendly" || n === "beginner friendly")
    return "badge.beginnerFriendly";
  if (n === "stretch") return "badge.stretch";
  if (n === "hard") return "badge.hard";
  return null;
}
