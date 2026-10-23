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
  DEFAULT_UI_LANG,
  translate,
  UI_LANG_STORAGE_KEY,
  type I18nKey,
  type TParams,
  type UiLang,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageContextValue = {
  lang: UiLang;
  ready: boolean;
  setLang: (next: UiLang) => void;
  t: (key: I18nKey, params?: TParams) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): UiLang {
  if (typeof window === "undefined") return DEFAULT_UI_LANG;
  try {
    const raw = localStorage.getItem(UI_LANG_STORAGE_KEY);
    // Only keep a previously chosen ml/hi; anything else → English.
    if (raw === "ml" || raw === "hi") return raw;
    return DEFAULT_UI_LANG;
  } catch {
    return DEFAULT_UI_LANG;
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(DEFAULT_UI_LANG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readStoredLang();
    setLangState(next);
    document.documentElement.lang = next === "en" ? "en" : next;
    try {
      localStorage.setItem(UI_LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setLang = useCallback((next: UiLang) => {
    setLangState(next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem(UI_LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: I18nKey, params?: TParams) => translate(lang, key, params),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, ready, setLang, t }),
    [lang, ready, setLang, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      <div
        className={cn(
          lang === "ml" && "font-ml",
          lang === "hi" && "font-deva",
        )}
        data-ui-lang={lang}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

/** `(key) => string` with English fallback for missing keys. */
export function useT(): (key: I18nKey, params?: TParams) => string {
  return useLanguage().t;
}
