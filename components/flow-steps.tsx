"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export type FlowStep = "match" | "explain" | "review";

/**
 * Top progress for issue + review pages. Current step in blue-600.
 */
export function FlowProgress({ current }: { current: FlowStep }) {
  const t = useT();
  const steps: { id: FlowStep; label: string; href: string }[] = [
    { id: "match", label: t("flow.match"), href: "/" },
    {
      id: "explain",
      label: t("flow.explain"),
      href: "/issue/nishal21/NekoDroid/4",
    },
    { id: "review", label: t("flow.review"), href: "/review" },
  ];
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <nav
      aria-label={t("nav.progress")}
      className="mb-8 overflow-x-auto border-b border-slate-200 pb-4"
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-1 text-sm sm:gap-2">
        {steps.map((step, i) => {
          const isCurrent = step.id === current;
          const isPast = i < currentIndex;
          return (
            <li key={step.id} className="flex items-center gap-1 sm:gap-2">
              {i > 0 ? (
                <span
                  className="mx-1 text-slate-300 select-none"
                  aria-hidden
                >
                  →
                </span>
              ) : null}
              <Link
                href={step.href}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "rounded-md px-1.5 py-0.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40",
                  isCurrent && "text-blue-600",
                  isPast && !isCurrent && "text-slate-500 hover:text-blue-600",
                  !isPast && !isCurrent && "text-slate-400 hover:text-slate-600",
                )}
              >
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Landing strip: three steps with one line each. */
export function LandingSteps() {
  const t = useT();
  const copy = [
    { title: t("steps.match.title"), line: t("steps.match.line") },
    { title: t("steps.explain.title"), line: t("steps.explain.line") },
    { title: t("steps.review.title"), line: t("steps.review.line") },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-3">
      {copy.map((step, i) => (
        <div
          key={step.title}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-semibold tracking-wide text-blue-600 uppercase">
            {t("steps.step", { n: i + 1 })}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {step.line}
          </p>
        </div>
      ))}
    </div>
  );
}
