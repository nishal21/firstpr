"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useT } from "@/components/language-provider";
import { cn } from "@/lib/utils";

export type FlowStep = "match" | "explain" | "review";

/**
 * Top progress for issue + review pages. Current step in primary.
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
      className="mb-8 overflow-x-auto border-b border-border pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex min-w-0 flex-nowrap items-center gap-1 text-sm snap-x snap-mandatory">
        {steps.map((step, i) => {
          const isCurrent = step.id === current;
          const isPast = i < currentIndex;
          return (
            <li
              key={step.id}
              className="flex shrink-0 snap-start items-center gap-1"
            >
              {i > 0 ? (
                <ChevronRight
                  className="mx-0.5 size-4 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
              <Link
                href={step.href}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-md px-3 py-2 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  isCurrent && "text-primary",
                  isPast &&
                    !isCurrent &&
                    "text-muted-foreground hover:text-primary",
                  !isPast &&
                    !isCurrent &&
                    "text-muted-foreground/70 hover:text-foreground",
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
