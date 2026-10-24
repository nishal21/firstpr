"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/language-provider";
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

export function SiteFooter() {
  const t = useT();
  const pathname = usePathname();

  return (
    <footer className="relative mt-auto overflow-hidden bg-[#172235] text-slate-100 md:rounded-t-3xl">
      <div
        aria-hidden
        className="footer-glow pointer-events-none absolute inset-0 opacity-40"
      />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 md:py-14">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Image
                src="/brand/logo-mark-192.png"
                alt=""
                width={32}
                height={32}
                className="footer-logo-float size-8"
              />
              <Image
                src="/brand/wordmark-dark.png"
                alt="FirstPR"
                width={129}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
            <p className="max-w-sm text-sm text-slate-400">{t("footer.tagline")}</p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm text-slate-300">
            {NAV_LINKS.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex min-h-11 items-center px-3 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-primary/50",
                    active && "font-medium text-white",
                  )}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 pt-6">
          <p className="text-sm font-medium text-slate-200">
            {t("footer.botTitle")}
          </p>
          <p className="max-w-2xl text-sm text-slate-400">{t("footer.botAbout")}</p>
          <a
            href="https://github.com/apps/firstprbot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-fit items-center text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t("footer.botLink")}
          </a>
        </div>

        <p className="text-sm text-slate-400">{t("footer.built")}</p>
      </div>
    </footer>
  );
}
