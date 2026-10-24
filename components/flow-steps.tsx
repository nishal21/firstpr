"use client";

import { useT } from "@/components/language-provider";

/** Landing strip: three steps with one line each. */
export function LandingSteps() {
  const t = useT();
  const copy = [
    { title: t("steps.match.title"), line: t("steps.match.line") },
    { title: t("steps.explain.title"), line: t("steps.explain.line") },
    { title: t("steps.review.title"), line: t("steps.review.line") },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {copy.map((step, i) => (
        <div
          key={step.title}
          className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {t("steps.step", { n: i + 1 })}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground break-words">
            {step.line}
          </p>
        </div>
      ))}
    </div>
  );
}
