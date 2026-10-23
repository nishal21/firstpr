"use client";

import { MatchForm } from "@/components/match-form";
import { useT } from "@/components/language-provider";

export function HomeMatchSection() {
  const t = useT();
  return (
    <section id="match" className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-12 sm:px-6">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-foreground">
        {t("home.matchHeading")}
      </h2>
      <MatchForm />
    </section>
  );
}
