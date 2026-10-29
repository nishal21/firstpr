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
          <div key={step.title} className="ink-card flex min-w-0 flex-col gap-3 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <p className="font-plex text-[11px] font-medium tracking-[0.16em] text-[var(--ink-soft)] uppercase">
                {t("steps.step", { n: i + 1 })}
              </p>
              <span className="font-spray text-5xl leading-none text-[#0473fd]" aria-hidden>
                {i + 1}
              </span>
            </div>
            <div className="min-w-0 sm:mt-3">
              <span className="mb-2 inline-flex size-9 items-center justify-center border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] sm:mb-3">
                <Icon className="size-4" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-[var(--ink)]">{step.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed break-words text-[var(--ink-soft)]">{step.line}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
