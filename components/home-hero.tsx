"use client";

import { useT } from "@/components/language-provider";

export function HomeHero() {
  const t = useT();
  return (
    <section className="hero-tint relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 hero-dots opacity-[0.45]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          {t("hero.subtitle")}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-500">
          {t("hero.trust")}
        </p>
      </div>
    </section>
  );
}
