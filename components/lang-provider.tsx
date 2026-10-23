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
import { usePathname, useRouter } from "next/navigation";
import {
  CONTENT_LANG_STORAGE_KEY,
  contentLangFontClass,
  parseContentLang,
  type ContentLang,
} from "@/lib/content-lang";
import { cn } from "@/lib/utils";

type LangContextValue = {
  lang: ContentLang;
  ready: boolean;
  setLang: (next: ContentLang) => void;
};

const LangContext = createContext<LangContextValue | null>(null);

function readStoredLang(): ContentLang {
  if (typeof window === "undefined") return "en";
  try {
    return parseContentLang(localStorage.getItem(CONTENT_LANG_STORAGE_KEY));
  } catch {
    return "en";
  }
}

function readUrlLang(): ContentLang | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("lang");
  return raw ? parseContentLang(raw) : null;
}

function applyDocumentLang(next: ContentLang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = next === "zh" ? "zh-CN" : next;
  document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLangState] = useState<ContentLang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = readUrlLang() ?? readStoredLang();
    setLangState(next);
    try {
      localStorage.setItem(CONTENT_LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyDocumentLang(next);
    setReady(true);

    const onPop = () => {
      const fromUrl = readUrlLang();
      if (fromUrl) {
        setLangState(fromUrl);
        applyDocumentLang(fromUrl);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setLang = useCallback(
    (next: ContentLang) => {
      setLangState(next);
      try {
        localStorage.setItem(CONTENT_LANG_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyDocumentLang(next);
      const params = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : "",
      );
      if (next === "en") {
        params.delete("lang");
      } else {
        params.set("lang", next);
      }
      const q = params.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const value = useMemo(
    () => ({ lang, ready, setLang }),
    [lang, ready, setLang],
  );

  const fontClass = contentLangFontClass(lang);

  return (
    <LangContext.Provider value={value}>
      <div className={cn(fontClass)} data-content-lang={lang}>
        {children}
      </div>
    </LangContext.Provider>
  );
}

export function useContentLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    throw new Error("useContentLang must be used within LangProvider");
  }
  return ctx;
}

/** Safe for optional use outside provider (returns English). */
export function useContentLangOptional(): LangContextValue {
  const ctx = useContext(LangContext);
  return (
    ctx ?? {
      lang: "en",
      ready: true,
      setLang: () => undefined,
    }
  );
}
