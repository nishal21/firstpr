"use client";

import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { useContentLangOptional } from "@/components/lang-provider";

function withLang(href: string, lang: string): string {
  if (lang === "en") return href;
  const join = href.includes("?") ? "&" : "?";
  return `${href}${join}lang=${lang}`;
}

export function SiteHeader() {
  const { lang } = useContentLangOptional();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={withLang("/", lang)}
          className="flex shrink-0 items-center gap-2 font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          <span className="size-2 rounded-full bg-blue-600" aria-hidden />
          FirstPR
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-x-4">
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-slate-600 sm:gap-x-5">
            <Link
              href={withLang("/", lang)}
              className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
            >
              Find an issue
            </Link>
            <Link
              href={withLang("/issue/nishal21/NekoDroid/4", lang)}
              className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
            >
              Explain
            </Link>
            <Link
              href={withLang("/review", lang)}
              className="outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
            >
              Review my PR
            </Link>
          </nav>
          <LangToggle />
        </div>
      </div>
    </header>
  );
}
