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

const TICKER_UNIT = "+ + + − − − ";
const TICKER = TICKER_UNIT.repeat(28);

export function SiteFooter() {
  const t = useT();
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = () => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    };
    const apply = () => {
      if (reduce.matches || document.hidden) el.dataset.motion = "off";
      else delete el.dataset.motion;
      if (reduce.matches || seen()) el.dataset.stamped = "true";
      else el.dataset.arm = "true";
    };
    apply();
    const io = new IntersectionObserver(
      ([entry]) => {
        const on = Boolean(entry?.isIntersecting);
        el.dataset.inview = on ? "true" : "false";
        if (on) el.dataset.stamped = "true";
      },
      { threshold: 0.05 },
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

  const groups: { label: string; links: { href: string; label: string; external?: boolean }[] }[] = [
    {
      label: t("footer.colProduct"),
      links: [
        { href: "/", label: t("nav.findIssue") },
        { href: "/issue/nishal21/NekoDroid/4", label: t("nav.explain") },
        { href: "/review", label: t("nav.review") },
      ],
    },
    {
      label: t("footer.colOpenSource"),
      links: [
        { href: SOURCE_URL, label: "GitHub", external: true },
        { href: BOT_URL, label: t("footer.botLink"), external: true },
        { href: LICENSE_URL, label: t("footer.license"), external: true },
      ],
    },
    {
      label: t("footer.colTeam"),
      links: [
        { href: "https://github.com/nishal21", label: "Nishal K", external: true },
        { href: "https://github.com/zenxrth", label: "Anan Shaji", external: true },
        { href: "#top", label: t("footer.backToTop") },
      ],
    },
    {
      label: t("footer.colLegal"),
      links: [
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
        { href: "/credits", label: t("footer.credits") },
      ],
    },
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
      <div className="footer-body">
        <p className="footer-stamp font-spray" aria-hidden>
          ✓ {t("footer.stamp")}
        </p>
        <nav aria-label={t("footer.nav")} className="footer-pills">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="font-plex mb-2 text-[11px] tracking-[0.16em] uppercase">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.links.map((pill) =>
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
                    <Link key={pill.href + pill.label} href={pill.href} className="sticker-pill">
                      {pill.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>
        <div className="footer-tools flex flex-wrap items-center gap-3">
          <ThemeToggle className="sticker-pill" />
          <LangToggle buttonClassName="sticker-pill" variant="sticker" />
        </div>
        <p className="font-plex text-[11px] tracking-wide">{t("footer.colophon")}</p>
      </div>
      <div className="footer-crowd" aria-hidden>
        <Image
          src="/brand/crowd.svg"
          alt=""
          width={8856}
          height={1287}
          loading="eager"
          unoptimized
          className="footer-crowd-img"
        />
      </div>
    </footer>
  );
}
