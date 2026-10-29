"use client";

import { useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/components/language-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#match", key: "nav.findIssue" as const },
  { href: "/#how", key: "nav.how" as const },
  { href: "/bot", key: "nav.bot" as const },
  { href: "/review", key: "nav.review" as const },
  { href: "/#pro", key: "nav.pro" as const },
];

function linkActive(pathname: string, href: string): boolean {
  if (href === "/#match") return pathname === "/";
  if (href.startsWith("/#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useT();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const menuId = useId();

  if (menuPath !== pathname) {
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Image
            src="/brand/logo-mark-192.png"
            alt=""
            width={28}
            height={28}
            className="size-7"
            priority
          />
          <Image
            src="/brand/wordmark-light.png"
            alt="FirstPR"
            width={120}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-x-5 text-sm text-muted-foreground md:flex">
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
          <LangToggle />
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
