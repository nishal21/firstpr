"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { UI_LANGS, UI_LANG_NATIVE, type UiLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t, ready } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: UiLang) {
    setLang(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        disabled={!ready}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 max-w-[9.5rem] items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-600 outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40 sm:max-w-none",
        )}
      >
        <Globe className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{UI_LANG_NATIVE[lang]}</span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t("nav.language")}
          className="absolute top-full right-0 z-50 mt-1 min-w-[9.5rem] overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-sm"
        >
          {UI_LANGS.map((code) => {
            const selected = code === lang;
            return (
              <li key={code} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => pick(code)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-slate-700 outline-none hover:bg-slate-50 focus-visible:bg-slate-50",
                    selected && "text-slate-900",
                  )}
                >
                  <span>{UI_LANG_NATIVE[code]}</span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0 text-blue-600" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
