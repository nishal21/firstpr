"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/components/language-provider";

const SOURCE_URL = "https://github.com/nishal21/firstpr";
const LICENSE_URL = "https://github.com/nishal21/firstpr/blob/main/LICENSE";
const BOT_URL = "https://github.com/apps/firstprbot";

const TICKER = "+ + + − − − + + + − − − + + + − − − ";

export function SiteFooter() {
  const t = useT();
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (reduce.matches || document.hidden) el.dataset.motion = "off";
      else delete el.dataset.motion;
      if (reduce.matches) el.dataset.stamped = "true";
    };
    apply();
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = Boolean(entry?.isIntersecting);
        el.dataset.inview = on ? "true" : "false";
        if (on) el.dataset.stamped = "true";
      },
      { threshold: 0.28 },
    );
    io.observe(el);
    reduce.addEventListener("change", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      reduce.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  const pills = [
    { href: "/", label: t("nav.findIssue") },
    { href: "/issue/nishal21/NekoDroid/4", label: t("nav.explain") },
    { href: "/review", label: t("nav.review") },
    { href: SOURCE_URL, label: "GitHub", external: true },
    { href: BOT_URL, label: t("footer.botLink"), external: true },
    { href: LICENSE_URL, label: t("footer.license"), external: true },
    { href: "https://github.com/nishal21", label: "Nishal K", external: true },
    { href: "https://github.com/zenxrth", label: "Anan Shaji", external: true },
  ];

  return (
    <footer ref={footerRef} className="site-footer">
      <div className="footer-ticker" aria-hidden>
        <div className="footer-ticker-track">
          <span>{TICKER}</span>
          <span>{TICKER}</span>
        </div>
      </div>
      <div className="footer-wordwrap">
        <p className="footer-word font-spray">{t("footer.word")}</p>
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-4 sm:px-6">
        <p className="footer-stamp font-spray" aria-hidden>
          ✓ {t("footer.stamp")}
        </p>
        <nav aria-label={t("footer.nav")} className="flex flex-wrap gap-3">
          {pills.map((pill) =>
            pill.external ? (
              <a
                key={pill.href + pill.label}
                href={pill.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sticker-pill"
              >
                {pill.label}
              </a>
            ) : (
              <Link key={pill.href} href={pill.href} className="sticker-pill">
                {pill.label}
              </Link>
            ),
          )}
          <Link href="#top" className="sticker-pill">
            {t("footer.backToTop")}
          </Link>
        </nav>
        <div className="footer-tools flex flex-wrap items-center gap-3">
          <ThemeToggle className="sticker-pill" />
          <LangToggle buttonClassName="sticker-pill" />
        </div>
        <p className="font-plex text-[11px] tracking-wide">{t("footer.colophon")}</p>
      </div>
      <div className="footer-crowd" aria-hidden>
        <Image src="/brand/crowd.svg" alt="" width={2400} height={420} />
      </div>
    </footer>
  );
}
