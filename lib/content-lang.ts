/** UI / LLM prose language (not the repo's programming language). */
export const CONTENT_LANGS = [
  "en",
  "ml",
  "hi",
  "ta",
  "te",
  "kn",
  "bn",
  "mr",
  "gu",
  "pa",
  "es",
  "fr",
  "de",
  "pt",
  "zh",
  "ja",
  "ko",
  "ar",
] as const;

export type ContentLang = (typeof CONTENT_LANGS)[number];

export const CONTENT_LANG_STORAGE_KEY = "firstpr-lang";

/** English name used in the LLM system-prompt line. */
export const CONTENT_LANG_NAMES: Record<ContentLang, string> = {
  en: "English",
  ml: "Malayalam",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ar: "Arabic",
};

/** Labels for the language picker (UI chrome stays English beside native name). */
export const CONTENT_LANG_OPTIONS: {
  value: ContentLang;
  label: string;
}[] = [
  { value: "en", label: "English" },
  { value: "ml", label: "Malayalam (മലയാളം)" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "ta", label: "Tamil (தமிழ்)" },
  { value: "te", label: "Telugu (తెలుగు)" },
  { value: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { value: "bn", label: "Bengali (বাংলা)" },
  { value: "mr", label: "Marathi (मराठी)" },
  { value: "gu", label: "Gujarati (ગુજરાતી)" },
  { value: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
  { value: "es", label: "Spanish (Español)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "zh", label: "Chinese (中文)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "ko", label: "Korean (한국어)" },
  { value: "ar", label: "Arabic (العربية)" },
];

/** Quick picks shown as a segmented control. */
export const CONTENT_LANG_QUICK: ContentLang[] = ["en", "ml", "hi"];

const CONTENT_LANG_SET = new Set<string>(CONTENT_LANGS);

/** CSS class for script-specific webfonts (see layout + globals.css). */
export function contentLangFontClass(lang: ContentLang): string | null {
  switch (lang) {
    case "ml":
      return "font-ml";
    case "hi":
    case "mr":
      return "font-deva";
    case "ta":
      return "font-ta";
    case "te":
      return "font-te";
    case "kn":
      return "font-kn";
    case "bn":
      return "font-bn";
    case "gu":
      return "font-gu";
    case "pa":
      return "font-pa";
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

export function isContentLang(value: unknown): value is ContentLang {
  return typeof value === "string" && CONTENT_LANG_SET.has(value);
}

/** Parse a query/body/storage value; unknown → "en". */
export function parseContentLang(value: string | null | undefined): ContentLang {
  const v = value?.trim().toLowerCase();
  if (isContentLang(v)) return v;
  return "en";
}

export function contentLangLabel(lang: ContentLang): string {
  return (
    CONTENT_LANG_OPTIONS.find((o) => o.value === lang)?.label ??
    CONTENT_LANG_NAMES[lang]
  );
}

/**
 * Append content-language instruction when not English.
 * Keeps paths, identifiers, commands, GitHub words, and line numbers in English.
 */
export function withContentLang(
  systemPrompt: string,
  lang: ContentLang | string | null | undefined,
): string {
  const parsed = parseContentLang(
    typeof lang === "string" || lang == null ? lang : String(lang),
  );
  if (parsed === "en") return systemPrompt;
  const name = CONTENT_LANG_NAMES[parsed];
  return `${systemPrompt}

Write every prose field in ${name}. Keep file paths, code identifiers, commands, GitHub words (issue, pull request, branch, commit, merge) and line numbers in English.`;
}

/** Cache-key segment for content language. */
export function contentLangCacheKey(
  lang: ContentLang | string | null | undefined,
): string {
  return parseContentLang(
    typeof lang === "string" || lang == null ? lang : String(lang),
  );
}
