"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeHero() {
  const t = useT();
  return (
    <section className="hero-tint relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 hero-dots opacity-[0.45]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-20">
        <p className="inline-flex rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
          {t("hero.eyebrow")}
        </p>
        <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          {t("hero.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t("hero.subtitle")}
        </p>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {t("hero.trust")}
        </p>
        <Link
          href="#match"
          className={cn(
            buttonVariants(),
            "mt-8 flex h-11 min-h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex sm:w-auto sm:px-6",
          )}
        >
          {t("hero.cta")}
        </Link>
      </div>
    </section>
  );
}
