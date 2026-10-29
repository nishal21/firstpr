"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
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

const LANG_CHANGE_EVENT = "firstpr-ui-lang-change";

function applyDocumentLang(next: UiLang) {
  document.documentElement.lang = next;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
}

function subscribeUiLang(onChange: () => void): () => void {
  window.addEventListener(LANG_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(LANG_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeReady(): () => void {
  return () => {};
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeReady, () => true, () => false);
  const lang = useSyncExternalStore(
    subscribeUiLang,
    readStoredUiLang,
    () => DEFAULT_UI_LANG,
  );

  // Apply the stored language before paint. The store snapshot is already
  // the saved value once `ready` is true, so this does not write English over it.
  useLayoutEffect(() => {
    if (!ready) return;
    applyDocumentLang(lang);
    writeStoredUiLang(lang);
  }, [ready, lang]);

  const setLang = useCallback((next: UiLang) => {
    writeStoredUiLang(next);
    applyDocumentLang(next);
    window.dispatchEvent(new Event(LANG_CHANGE_EVENT));
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
