"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_UI_LANG,
  readStoredUiLang,
  translate,
  uiLangFontClass,
  writeStoredUiLang,
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

function subscribeStoredLang(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function subscribeReady() {
  return () => {};
}

function clientReady() {
  return true;
}

function serverReady() {
  return false;
}

function applyDocumentLang(next: UiLang) {
  document.documentElement.lang = next;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(
    subscribeStoredLang,
    readStoredUiLang,
    () => DEFAULT_UI_LANG,
  );
  const [override, setOverride] = useState<UiLang | null>(null);
  const lang = override ?? stored;
  const ready = useSyncExternalStore(subscribeReady, clientReady, serverReady);

  useLayoutEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  const setLang = useCallback((next: UiLang) => {
    setOverride(next);
    applyDocumentLang(next);
    writeStoredUiLang(next);
  }, []);

  const t = useCallback(
    (key: I18nKey, params?: TParams) => translate(lang, key, params),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, ready, setLang, t }),
    [lang, ready, setLang, t],
  );

  const fontClass = uiLangFontClass(lang);

  return (
    <LanguageContext.Provider value={value}>
      <div className={cn(fontClass)} data-ui-lang={lang}>
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
