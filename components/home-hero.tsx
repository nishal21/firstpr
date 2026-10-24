"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { FadeUp, WordsPullUp } from "@/components/ui/words-pull-up";
import { cn } from "@/lib/utils";

export function HomeHero() {
  const t = useT();
  return (
    <section className="hero-tint relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 hero-dots opacity-[0.45]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-16 sm:px-6 md:pt-24 md:pb-24">
        <FadeUp>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-sm text-accent-foreground backdrop-blur">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            {t("hero.eyebrow")}
          </p>
        </FadeUp>

        <div className="mt-8 grid grid-cols-12 items-end gap-x-6 gap-y-8">
          <h1 className="col-span-12 text-[2.6rem] leading-[0.98] font-semibold tracking-[-0.045em] text-foreground sm:text-6xl lg:col-span-8 lg:text-7xl">
            <WordsPullUp text={t("hero.title")} />
          </h1>

          <div className="col-span-12 flex flex-col gap-6 lg:col-span-4 lg:pb-2">
            <FadeUp delay={0.45}>
              <p className="text-base leading-relaxed text-muted-foreground">
                {t("hero.subtitle")}
              </p>
            </FadeUp>
            <FadeUp delay={0.6} className="flex flex-wrap items-center gap-x-5 gap-y-3">
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
            </FadeUp>
          </div>
        </div>
      </div>
    </section>
  );
}
