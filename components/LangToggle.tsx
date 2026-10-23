"use client";

import { useContentLang } from "@/components/lang-provider";
import {
  CONTENT_LANG_OPTIONS,
  CONTENT_LANG_QUICK,
  type ContentLang,
} from "@/lib/content-lang";
import { cn } from "@/lib/utils";

const QUICK_LABEL: Record<"en" | "ml" | "hi", string> = {
  en: "EN",
  ml: "മല",
  hi: "हिं",
};

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, ready } = useContentLang();
  const isQuick = (CONTENT_LANG_QUICK as readonly ContentLang[]).includes(lang);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-1.5",
        className,
      )}
    >
      <div
        role="group"
        aria-label="Quick language"
        className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium text-slate-600"
      >
        {CONTENT_LANG_QUICK.map((value) => {
          const active = ready && lang === value;
          return (
            <button
              key={value}
              type="button"
              title={
                CONTENT_LANG_OPTIONS.find((o) => o.value === value)?.label
              }
              aria-pressed={active}
              disabled={!ready}
              onClick={() => setLang(value)}
              className={cn(
                "rounded-md px-2 py-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-600/40",
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "hover:text-slate-900",
              )}
            >
              {QUICK_LABEL[value as "en" | "ml" | "hi"]}
            </button>
          );
        })}
      </div>

      <label className="sr-only" htmlFor="firstpr-lang-more">
        More languages
      </label>
      <select
        id="firstpr-lang-more"
        aria-label="More languages"
        disabled={!ready}
        value={isQuick ? "" : lang}
        onChange={(e) => {
          const v = e.target.value as ContentLang | "";
          if (v) setLang(v);
        }}
        className={cn(
          "h-7 max-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
          !isQuick && "border-blue-200 text-slate-900",
        )}
      >
        <option value="" disabled={isQuick}>
          {isQuick ? "More…" : "More languages"}
        </option>
        {CONTENT_LANG_OPTIONS.filter(
          (o) => !CONTENT_LANG_QUICK.includes(o.value),
        ).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
