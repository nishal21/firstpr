"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";
import { SearchKeycaps } from "@/components/search-keycaps";
import { useT } from "@/components/language-provider";
import { useSearch } from "@/components/search-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", key: "nav.findIssue" as const },
  { href: "/issue/nishal21/NekoDroid/4", key: "nav.explain" as const },
  { href: "/review", key: "nav.review" as const },
];

function linkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useT();
  const { setOpen } = useSearch();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header id="top" className="sticky top-0 z-50 border-b-[3px] border-[#16140f] bg-background dark:border-[#f4efe6]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-1.5 px-3 sm:gap-2 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Image
            src="/brand/logo-mark-192.png"
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0"
          />
          <Image
            src="/brand/wordmark-light.png"
            alt="FirstPR"
            width={120}
            height={24}
            className="wordmark-light h-5 w-auto sm:h-6"
          />
          <Image
            src="/brand/wordmark-dark.png"
            alt=""
            width={120}
            height={24}
            className="wordmark-dark h-5 w-auto sm:h-6"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-x-5 text-sm text-muted-foreground md:flex">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-11 items-center gap-3 border-[3px] border-[#16140f] bg-[#fffdf8] px-3 text-[#16140f] shadow-[3px_3px_0_#16140f] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0473fd]"
          >
            <Search className="size-4" aria-hidden />
            <span>{t("nav.search")}</span>
            <SearchKeycaps />
          </button>
          {NAV_LINKS.map((link) => {
            const active = linkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40",
                  active && "font-medium text-primary",
                )}
              >
                {t(link.key)}
              </Link>
            );
          })}
          <LangToggle />
        </nav>

        {/* Mobile: lang + menu — no overflow-hidden so LangToggle portal stays free */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-xl text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={t("search.open")}
          >
            <Search className="size-5" aria-hidden />
          </button>
          <LangToggle compact />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id={menuId}
          className="border-t border-border bg-background md:hidden"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-3 py-3 sm:px-5">
            {NAV_LINKS.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex min-h-12 items-center rounded-xl px-3 text-base text-foreground outline-none hover:bg-muted hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40",
                    active && "bg-accent font-medium text-primary",
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
