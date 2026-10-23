"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { UI_LANGS, UI_LANG_NATIVE, type UiLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MenuPos = { top: number; right: number };

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t, ready } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPos(null);
      return;
    }
    function place() {
      const rect = buttonRef.current!.getBoundingClientRect();
      setPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const menu =
    open && mounted && pos
      ? createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={t("nav.language")}
            style={{ top: pos.top, right: pos.right }}
            className="fixed z-[100] w-40 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-sm"
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
                    <span className="whitespace-nowrap">
                      {UI_LANG_NATIVE[code]}
                    </span>
                    {selected ? (
                      <Check
                        className="size-3.5 shrink-0 text-blue-600"
                        aria-hidden
                      />
                    ) : (
                      <span className="size-3.5 shrink-0" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      <button
        ref={buttonRef}
        type="button"
        disabled={!ready}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("nav.language")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600/40 disabled:opacity-60"
      >
        <Globe className="size-3.5 shrink-0" aria-hidden />
        <span>{UI_LANG_NATIVE[lang]}</span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
