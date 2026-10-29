"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { UI_LANGS, UI_LANG_NATIVE, type UiLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function subscribeReady() {
  return () => {};
}

type MenuPos = {
  top?: number;
  bottom?: number;
  right: number;
  maxHeight: number;
};

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t, ready } = useLanguage();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const mounted = useSyncExternalStore(
    subscribeReady,
    () => true,
    () => false,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPos(null);
      return;
    }
    function place() {
      const rect = buttonRef.current!.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
      const spaceAbove = rect.top - gap - 8;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(380, Math.max(180, openUp ? spaceAbove : spaceBelow));
      if (openUp) {
        setPos({
          bottom: window.innerHeight - rect.top + gap,
          right: Math.max(8, window.innerWidth - rect.right),
          maxHeight,
        });
      } else {
        setPos({
          top: rect.bottom + gap,
          right: Math.max(8, window.innerWidth - rect.right),
          maxHeight,
        });
      }
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
            style={{
              top: pos.top,
              bottom: pos.bottom,
              right: pos.right,
              maxHeight: pos.maxHeight,
            }}
            className="fixed z-[200] w-56 overflow-y-auto overscroll-contain rounded-md border border-border bg-card py-1 text-sm shadow-lg [scrollbar-gutter:stable]"
          >
            {UI_LANGS.map((code) => {
              const selected = code === lang;
              return (
                <li key={code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(code)}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-foreground outline-none hover:bg-muted focus-visible:bg-muted",
                      selected && "bg-muted text-foreground",
                    )}
                  >
                    <span className="whitespace-nowrap">
                      {UI_LANG_NATIVE[code]}
                    </span>
                    {selected ? (
                      <Check
                        className="size-3.5 shrink-0 text-primary"
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
        className="inline-flex min-h-11 h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
      >
        <Globe className="size-3.5 shrink-0" aria-hidden />
        <span>{ready ? UI_LANG_NATIVE[lang] : "…"}</span>
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
