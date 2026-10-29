"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { useT } from "@/components/language-provider";
import { SiteSearch } from "@/components/site-search";
import type { I18nKey } from "@/lib/i18n";

const GLIMPSE: readonly {
  step: I18nKey;
  repo: I18nKey;
  badge: I18nKey;
  label: I18nKey;
  next: I18nKey;
}[] = [
  {
    step: "hero.glimpseMatchTitle",
    repo: "hero.glimpseMatchRepo",
    badge: "hero.glimpseMatchBadge",
    label: "hero.glimpseMatchLabel",
    next: "hero.glimpseMatchNext",
  },
  {
    step: "hero.glimpseExplainTitle",
    repo: "hero.glimpseExplainRepo",
    badge: "hero.glimpseExplainBadge",
    label: "hero.glimpseExplainLabel",
    next: "hero.glimpseExplainNext",
  },
  {
    step: "hero.glimpseReviewTitle",
    repo: "hero.glimpseReviewRepo",
    badge: "hero.glimpseReviewBadge",
    label: "hero.glimpseReviewLabel",
    next: "hero.glimpseReviewNext",
  },
];

export function HomeHero() {
  const t = useT();
  const glimpseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glimpseRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.dataset.motion = "off";
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.inview = entry?.isIntersecting ? "true" : "false";
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="hero-tint relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-dots opacity-40" aria-hidden />
      <Image
        src="/brand/logo-mark-192.png"
        alt=""
        width={96}
        height={96}
        className="pointer-events-none absolute top-6 right-3 size-14 -rotate-6 opacity-90 sm:top-10 sm:right-10 sm:size-20"
      />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-10 pb-12 text-center sm:px-6 md:pt-16 md:pb-16">
        <p className="inline-flex items-center rounded-full border border-primary/20 bg-white/80 px-3 py-1 text-sm text-accent-foreground">
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-5 max-w-[14ch] text-[2.35rem] leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-foreground sm:max-w-none sm:text-6xl">
          {t("hero.headline")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-[1.05rem]">
          {t("hero.sub")}
        </p>
        <div className="relative mt-7 w-full text-left">
          <div
            className="pointer-events-none absolute -inset-x-3 -inset-y-3 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(4,115,253,0.18),transparent_68%)]"
            aria-hidden
          />
          <SiteSearch />
        </div>
        <ul className="mt-4 flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <li>{t("hero.trustPublic")}</li>
          <li className="hidden text-primary/40 sm:inline" aria-hidden>
            ·
          </li>
          <li className="hidden sm:inline">{t("hero.trustNeko")}</li>
        </ul>

        <div
          ref={glimpseRef}
          className="hero-glimpse mt-5 grid w-full max-w-md"
          aria-label={t("hero.glimpseLabel")}
        >
          {GLIMPSE.map((card) => (
            <article
              key={card.step}
              className="glimpse-card col-start-1 row-start-1 rounded-2xl border border-[#d3e3f8] bg-white p-3 text-left shadow-[0_8px_24px_rgba(4,115,253,0.06)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                  {t(card.step)}
                </p>
                <p className="rounded-full bg-[#e7f8ee] px-2 py-0.5 text-[11px] font-medium text-[#0f7a3a]">
                  {t(card.badge)}
                </p>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground">{t(card.repo)}</p>
              <p className="mt-1.5">
                <span className="inline-flex rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                  {t(card.label)}
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t(card.next)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
