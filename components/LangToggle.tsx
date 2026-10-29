"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { UI_LANGS, UI_LANG_NATIVE, uiLangFontClass, type UiLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function subscribeReady() {
  return () => {};
}

type MenuPos = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  width?: number;
  maxHeight: number;
};

/** Keep the menu this far from every viewport edge. */
const EDGE = 8;

export function LangToggle({
  className,
  compact = false,
  buttonClassName,
  variant = "menu",
}: {
  className?: string;
  compact?: boolean;
  buttonClassName?: string;
  /**
   * "menu" drops down from the header. "sticker" is the footer picker: it
   * always opens upward from the trigger, in the footer's sticker style.
   */
  variant?: "menu" | "sticker";
}) {
  const sticker = variant === "sticker";
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
      if (sticker) {
        // Open upward, start-aligned to the trigger, clamped on screen.
        const width = Math.min(320, window.innerWidth - EDGE * 2);
        const left = Math.min(
          Math.max(EDGE, rect.left),
          window.innerWidth - EDGE - width,
        );
        setPos({
          bottom: window.innerHeight - rect.top + gap + 2,
          left,
          width,
          maxHeight: Math.max(160, rect.top - gap - 2 - EDGE),
        });
        return;
      }
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
  }, [open, sticker]);

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
              left: pos.left,
              right: pos.right,
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className={cn(
              "fixed z-[200] overflow-y-auto overscroll-contain text-sm",
              sticker
                ? "lang-sticker-menu grid grid-cols-2 gap-1 p-2"
                : "w-56 rounded-md border border-border bg-card py-1 shadow-lg [scrollbar-gutter:stable]",
            )}
          >
            {UI_LANGS.map((code) => {
              const selected = code === lang;
              return (
                <li key={code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(code)}
                    className={cn(
                      sticker
                        ? "lang-sticker-option flex min-h-10 w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left outline-none"
                        : "flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-foreground outline-none hover:bg-muted focus-visible:bg-muted",
                      selected && (sticker ? "is-selected" : "bg-muted text-foreground"),
                    )}
                  >
                    <span
                      lang={code}
                      className={cn(
                        sticker ? "min-w-0 leading-tight [overflow-wrap:anywhere]" : "whitespace-nowrap",
                        uiLangFontClass(code),
                      )}
                    >
                      {UI_LANG_NATIVE[code]}
                    </span>
                    {selected ? (
                      <Check
                        className={cn("size-3.5 shrink-0", sticker ? "text-current" : "text-primary")}
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
        className={cn(
          "inline-flex h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card text-sm text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60",
          compact ? "size-11 justify-center px-0" : "min-h-11 px-3",
          buttonClassName,
        )}
      >
        <Globe className="size-3.5 shrink-0" aria-hidden />
        {compact ? (
          <span className="sr-only">{ready ? UI_LANG_NATIVE[lang] : "…"}</span>
        ) : (
          <span lang={ready ? lang : undefined} className={ready ? (uiLangFontClass(lang) ?? undefined) : undefined}>
            {ready ? UI_LANG_NATIVE[lang] : "…"}
          </span>
        )}
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-slate-400 transition-transform",
            compact && "hidden",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
