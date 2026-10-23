"use client";

import { MatchForm } from "@/components/match-form";
import { useT } from "@/components/language-provider";

export function HomeMatchSection() {
  const t = useT();
  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
      <h2 className="mb-6 text-xl font-semibold tracking-tight text-slate-900">
        {t("home.matchHeading")}
      </h2>
      <MatchForm />
    </section>
  );
}
