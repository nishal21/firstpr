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

/**
 * Supported UI languages (English default).
 * Order = what shows at the top of the globe menu (major world langs first).
 */
export const UI_LANGS = [
  "en",
  "es",
  "zh",
  "hi",
  "ar",
  "fr",
  "pt",
  "ru",
  "ja",
  "de",
  "ko",
  "id",
  "bn",
  "ta",
  "ml",
] as const;

/** Bump when the language list changes so clients drop stale caches/feel a refresh. */
export const UI_LANG_LIST_VERSION = 2;

export type UiLang = (typeof UI_LANGS)[number];

export const DEFAULT_UI_LANG: UiLang = "en";

/** Separate from legacy AI content-lang key so the two never overwrite each other. */
export const UI_LANG_STORAGE_KEY = "firstpr-ui-lang";
const LEGACY_UI_LANG_STORAGE_KEY = "firstpr-lang";

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

/** Read preferred UI lang from localStorage (new key, then legacy). */
export function readStoredUiLang(): UiLang {
  if (typeof window === "undefined") return DEFAULT_UI_LANG;
  try {
    const fresh = localStorage.getItem(UI_LANG_STORAGE_KEY);
    if (fresh != null) return parseUiLang(fresh);
    const legacy = localStorage.getItem(LEGACY_UI_LANG_STORAGE_KEY);
    return parseUiLang(legacy);
  } catch {
    return DEFAULT_UI_LANG;
  }
}

export function writeStoredUiLang(lang: UiLang): void {
  try {
    localStorage.setItem(UI_LANG_STORAGE_KEY, lang);
    // Keep legacy key in sync for anything still reading it.
    localStorage.setItem(LEGACY_UI_LANG_STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
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
