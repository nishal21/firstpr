"use client";

import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/components/language-provider";

export function SiteHeader() {
  const t = useT();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          <span className="size-2 rounded-full bg-blue-600" aria-hidden />
          FirstPR
        </Link>

        <nav className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-x-3 overflow-x-auto text-sm text-slate-600 sm:gap-x-5">
          <Link
            href="/"
            className="shrink-0 whitespace-nowrap outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            {t("nav.findIssue")}
          </Link>
          <Link
            href="/issue/nishal21/NekoDroid/4"
            className="shrink-0 whitespace-nowrap outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            {t("nav.explain")}
          </Link>
          <Link
            href="/review"
            className="shrink-0 whitespace-nowrap outline-none hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            {t("nav.review")}
          </Link>
          <LangToggle />
        </nav>
      </div>
    </header>
  );
}
