"use client";

import { useEffect, useRef } from "react";
import { useT } from "@/components/language-provider";
import { SiteSearch } from "@/components/site-search";

const GLIMPSE = [
  { title: "hero.glimpseMatchTitle", body: "hero.glimpseMatchBody" },
  { title: "hero.glimpseExplainTitle", body: "hero.glimpseExplainBody" },
  { title: "hero.glimpseReviewTitle", body: "hero.glimpseReviewBody" },
] as const;

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
      <div className="pointer-events-none absolute inset-0 hero-dots opacity-[0.4]" aria-hidden />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 pt-12 pb-14 text-center sm:px-6 md:pt-20 md:pb-20">
        <p className="hero-rise inline-flex items-center rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-sm text-accent-foreground">
          {t("hero.eyebrow")}
        </p>
        <h1 className="hero-rise hero-rise-delay mt-6 text-[2rem] leading-[1.05] font-semibold tracking-[-0.045em] text-balance text-foreground sm:text-5xl md:text-6xl">
          {t("hero.headline")}
        </h1>
        <p className="hero-rise hero-rise-delay-2 mt-4 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-[1.05rem]">
          {t("hero.sub")}
        </p>
        <div className="hero-rise hero-rise-delay-2 mt-8 w-full text-left">
          <SiteSearch />
          <p className="mt-2 px-1 text-center text-xs text-muted-foreground sm:hidden">
            {t("hero.shortcut")}
          </p>
        </div>

        <div
          ref={glimpseRef}
          className="hero-glimpse relative mt-8 h-[11.5rem] w-full max-w-md sm:h-[8.75rem]"
          aria-label={t("hero.glimpseLabel")}
        >
          {GLIMPSE.map((card) => (
            <div
              key={card.title}
              className="glimpse-card absolute inset-0 flex flex-col justify-center rounded-2xl border border-[#d7e3f4] bg-white/90 px-4 py-3 text-left"
            >
              <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
                {t(card.title)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{t(card.body)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
