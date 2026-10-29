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
  left: number;
  width: number;
  maxHeight: number;
};

/** Keep the menu this far from every viewport edge. */
const EDGE = 8;

/** Rough height of the two-column menu, used to decide which way it fits. */
const MENU_HEIGHT = 400;

export function LangToggle({
  className,
  compact = false,
  buttonClassName,
  placement = "down",
  align = "start",
}: {
  className?: string;
  compact?: boolean;
  buttonClassName?: string;
  /** Which side of the trigger the menu opens on. "down" flips up when there is no room below. */
  placement?: "up" | "down";
  /** Line the menu up with the trigger's left ("start") or right ("end") edge. */
  align?: "start" | "end";
}) {
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
      const gap = 6;
      const width = Math.min(320, window.innerWidth - EDGE * 2);
      const wantLeft = align === "end" ? rect.right - width : rect.left;
      const left = Math.min(Math.max(EDGE, wantLeft), window.innerWidth - EDGE - width);
      const spaceBelow = window.innerHeight - rect.bottom - gap - EDGE;
      const spaceAbove = rect.top - gap - EDGE;
      const up =
        placement === "up"
          ? !(spaceAbove < MENU_HEIGHT && spaceBelow > spaceAbove)
          : spaceBelow < MENU_HEIGHT && spaceAbove > spaceBelow;
      if (up) {
        setPos({
          bottom: window.innerHeight - rect.top + gap,
          left,
          width,
          maxHeight: Math.max(160, spaceAbove),
        });
      } else {
        setPos({
          top: rect.bottom + gap,
          left,
          width,
          maxHeight: Math.max(160, spaceBelow),
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
  }, [open, placement, align]);

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
              width: pos.width,
              maxHeight: pos.maxHeight,
            }}
            className="lang-sticker-menu fixed z-[200] grid grid-cols-2 gap-1 overflow-y-auto overscroll-contain p-2 text-sm"
          >
            {UI_LANGS.map((code) => {
              const selected = code === lang;
              return (
                <li key={code} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => pick(code)}
                    className={cn(
                      "lang-sticker-option flex min-h-10 w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left outline-none",
                      selected && "is-selected",
                    )}
                  >
                    <span
                      lang={code}
                      className={cn("min-w-0 leading-tight [overflow-wrap:anywhere]", uiLangFontClass(code))}
                    >
                      {UI_LANG_NATIVE[code]}
                    </span>
                    {selected ? (
                      <Check className="size-3.5 shrink-0 text-current" aria-hidden />
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
