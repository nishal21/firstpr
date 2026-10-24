"use client";

import { MatchForm } from "@/components/match-form";
import { useT } from "@/components/language-provider";
import { FadeUp } from "@/components/ui/words-pull-up";

export function HomeMatchSection() {
  const t = useT();
  return (
    <section id="match" className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-10 pb-16 sm:px-6 md:pt-14 md:pb-24">
      <FadeUp inView>
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {t("steps.step", { n: 1 })}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t("home.matchHeading")}
        </h2>
        <p className="mt-2 mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("steps.match.line")}
        </p>
        <MatchForm />
      </FadeUp>
    </section>
  );
}
