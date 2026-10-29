"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { useT } from "@/components/language-provider";
import { cn } from "@/lib/utils";

const STEPS = ["match", "explain", "bot"] as const;
type Step = (typeof STEPS)[number];

export function LiveDemo() {
  const t = useT();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const [step, setStep] = useState<Step>(reduce ? "explain" : "match");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused || !inView) return;
    const id = window.setInterval(() => {
      setStep((current) => {
        const index = STEPS.indexOf(current);
        return STEPS[(index + 1) % STEPS.length];
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [reduce, paused, inView]);

  return (
    <div ref={ref} className="relative">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {t("hero.preview")}
        </p>
        <button
          type="button"
          className="min-h-11 rounded-full px-3 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-pressed={paused || Boolean(reduce)}
          onClick={() => setPaused((value) => !value)}
        >
          {paused || reduce ? "Play" : "Pause"}
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(15_24_40/0.04),0_12px_32px_rgb(15_24_40/0.06)]">
        <div className="flex gap-1 border-b border-border bg-secondary/70 px-3 py-2" role="tablist" aria-label={t("hero.preview")}>
          {STEPS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={step === item}
              className={cn(
                "min-h-11 rounded-lg px-3 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                step === item ? "bg-white font-medium text-foreground shadow-sm" : "text-muted-foreground",
              )}
              onClick={() => {
                setPaused(true);
                setStep(item);
              }}
            >
              {item === "bot" ? "Bot" : item}
            </button>
          ))}
        </div>
        <div className="min-h-64 p-4 sm:p-5" role="tabpanel">
          {step === "match" ? <MatchFrame /> : null}
          {step === "explain" ? <ExplainFrame /> : null}
          {step === "bot" ? <BotFrame /> : null}
        </div>
      </div>
    </div>
  );
}

function MatchFrame() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-md border border-border bg-secondary px-2 py-1">TypeScript</span>
        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">Looks free</span>
      </div>
      <p className="text-base font-semibold tracking-tight text-foreground">
        #128 Add a keyboard shortcut for the filter menu
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Mentions <span className="font-mono text-xs">src/filter.tsx</span> and you write TypeScript. No assignee. No open pull request.
      </p>
      <div className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-medium text-white">
        Explain this issue
      </div>
    </div>
  );
}

function ExplainFrame() {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Where to look</p>
      <div className="rounded-xl border border-border bg-secondary/60 p-3">
        <p className="font-mono text-sm text-foreground">src/filter.tsx 40–58</p>
        <p className="mt-1 text-sm text-muted-foreground">The menu opens here. The shortcut is not wired yet.</p>
      </div>
      <p className="text-sm text-foreground">You are done when the menu opens from the keyboard and the existing click path still works.</p>
      <p className="text-xs text-muted-foreground">Level 1 hint stays a pointer. The patch is yours.</p>
    </div>
  );
}

function BotFrame() {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl bg-secondary px-3 py-2 text-muted-foreground">
        <span className="font-mono text-foreground">/firstpr explain</span>
      </div>
      <div className="rounded-xl border border-border bg-white px-3 py-3">
        <p className="font-medium text-foreground">FirstPRbot</p>
        <p className="mt-1 text-muted-foreground">
          Look at <span className="font-mono text-xs">src/filter.tsx</span>. Done when the shortcut opens the menu. I will not write the fix.
        </p>
      </div>
    </div>
  );
}
