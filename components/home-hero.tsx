"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LiveDemo } from "@/components/live-demo";
import { useT } from "@/components/language-provider";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { FadeUp, WordsPullUp } from "@/components/ui/words-pull-up";
import { cn } from "@/lib/utils";

export function HomeHero() {
  const t = useT();
  const title = t("hero.title");
  const mark = t("hero.titleMark");
  const index = title.toLowerCase().indexOf(mark.toLowerCase());
  const before = index >= 0 ? title.slice(0, index).trim() : title;
  const emphasis = index >= 0 ? title.slice(index, index + mark.length) : "";
  const after = index >= 0 ? title.slice(index + mark.length).trim() : "";

  return (
    <section className="hero-tint relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 hero-dots opacity-[0.45]" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 pt-12 pb-16 sm:px-6 md:pt-20 md:pb-24">
        <FadeUp>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-sm text-accent-foreground backdrop-blur">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            {t("hero.eyebrow")}
          </p>
        </FadeUp>
        <h1 className="mt-6 max-w-4xl text-[2.5rem] leading-[1.02] font-extrabold tracking-[-0.045em] text-foreground sm:text-6xl">
          {index < 0 ? (
            <WordsPullUp text={title} />
          ) : (
            <>
              {before}{" "}
              <span className="relative inline-block">
                {emphasis}
                <svg className="absolute -bottom-1 left-0 h-3 w-full" viewBox="0 0 200 12" aria-hidden>
                  <path
                    d="M2 8 C 40 2, 90 12, 198 5"
                    className="ink-underline"
                    fill="none"
                    stroke="#0473FD"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              {after ? (after.startsWith(",") || after.startsWith(".") ? after : ` ${after}`) : null}
            </>
          )}
        </h1>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("hero.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="#match" className={cn(arrowPillClass, "w-full sm:w-auto")}>
                {t("hero.cta")}
                <ArrowBubble />
              </Link>
              <Link
                href="/review"
                className="inline-flex min-h-11 items-center text-sm font-medium text-foreground outline-none underline-offset-4 hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {t("nav.review")}
              </Link>
            </div>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li>{t("hero.proof1")}</li>
              <li>{t("hero.proof2")}</li>
              <li>{t("hero.proof3")}</li>
            </ul>
          </div>
          <LiveDemo />
        </div>
      </div>
    </section>
  );
}
