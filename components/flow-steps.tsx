"use client";

import { BookOpenText, GitPullRequestArrow, Search } from "lucide-react";
import { useT } from "@/components/language-provider";

const ICONS = [Search, BookOpenText, GitPullRequestArrow];

/** Landing strip: three steps with one line each. */
export function LandingSteps() {
  const t = useT();
  const copy = [
    { title: t("steps.match.title"), line: t("steps.match.line") },
    { title: t("steps.explain.title"), line: t("steps.explain.line") },
    { title: t("steps.review.title"), line: t("steps.review.line") },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {copy.map((step, i) => {
        const Icon = ICONS[i]!;
        return (
          <div
            key={step.title}
            className="group relative flex min-w-0 gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:block sm:p-6"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-3 right-3 text-6xl font-semibold tracking-tighter text-primary/[0.06] select-none sm:text-7xl"
            >
              {i + 1}
            </span>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-primary uppercase sm:mt-5">
                {t("steps.step", { n: i + 1 })}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground break-words sm:mt-2">
                {step.line}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
