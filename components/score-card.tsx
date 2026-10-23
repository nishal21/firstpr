"use client";

import { Check, Circle, Copy, ExternalLink, Minus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useT } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { I18nKey } from "@/lib/i18n";
import {
  formatReviewMarkdown,
  type ReviewChecklistItem,
  type ReviewLineComment,
  type ReviewResult,
} from "@/lib/review-format";
import type { Verdict } from "@/lib/score";

function verdictClass(v: Verdict): string {
  if (v === "ready") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (v === "almost") return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-red-50 text-red-800 border-red-200";
}

function ScoreRing({
  score,
  outOfLabel,
}: {
  score: number;
  outOfLabel: string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const offset = c * (1 - pct);
  const stroke =
    score >= 80 ? "#059669" : score >= 55 ? "#d97706" : "#dc2626";

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums text-slate-900">
          {score}
        </span>
        <span className="text-xs text-slate-500">{outOfLabel}</span>
      </div>
    </div>
  );
}

function StatusIcon({
  status,
  naTitle,
}: {
  status: ReviewChecklistItem["status"];
  naTitle: string;
}) {
  if (status === "pass") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "warn") {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <Circle className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      </span>
    );
  }
  if (status === "na") {
    return (
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"
        title={naTitle}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
    </span>
  );
}

function verdictKey(v: Verdict): I18nKey {
  if (v === "ready") return "verdict.ready";
  if (v === "almost") return "verdict.almost";
  return "verdict.needs";
}

function severityKey(
  severity: ReviewLineComment["severity"],
): I18nKey {
  if (severity === "blocker") return "score.blocker";
  if (severity === "suggestion") return "score.suggestion";
  return "score.nit";
}

function severityBadge(severity: ReviewLineComment["severity"]) {
  if (severity === "blocker")
    return "border-red-200 bg-red-50 text-red-800";
  if (severity === "suggestion")
    return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function ScoreCard({ result }: { result: ReviewResult }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => formatReviewMarkdown(result), [result]);

  const byFile = useMemo(() => {
    const map = new Map<string, ReviewLineComment[]>();
    for (const c of result.line_comments) {
      const list = map.get(c.path) ?? [];
      list.push(c);
      map.set(c.path, list);
    }
    return [...map.entries()];
  }, [result.line_comments]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <ScoreRing score={result.score} outOfLabel={t("score.outOf")} />
          <div className="flex-1 space-y-3">
            <Badge
              variant="outline"
              className={`rounded-lg border px-2.5 py-1 text-sm font-medium ${verdictClass(result.verdict)}`}
            >
              {t(verdictKey(result.verdict))}
            </Badge>
            <p className="text-base text-slate-700">{result.summary}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={copyMarkdown}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? t("score.copied") : t("score.copy")}
            </Button>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          {t("score.checklist")}
        </h2>
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {result.checklist.map((item) => (
            <li
              key={`${item.source}-${item.id}`}
              className="flex gap-3 px-4 py-3.5"
            >
              <StatusIcon
                status={item.status}
                naTitle={t("score.notApplicable")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      item.status === "na" ? "text-slate-500" : "text-slate-900"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.status === "na" ? (
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {t("score.notApplicable")}
                    </span>
                  ) : (
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      {item.source === "ai" ? t("score.ai") : t("score.rule")}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{item.evidence}</p>
                {item.status !== "pass" &&
                item.status !== "na" &&
                item.fix ? (
                  <p className="mt-1 text-sm text-blue-600">{item.fix}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {byFile.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            {t("score.lineComments")}
          </h2>
          <div className="space-y-4">
            {byFile.map(([path, comments]) => (
              <div
                key={path}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="font-mono text-sm text-slate-800">{path}</p>
                <ul className="mt-3 space-y-3">
                  {comments.map((c, i) => (
                    <li key={`${c.path}:${c.line}:${i}`} className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          L{c.line}
                        </span>
                        <Badge
                          variant="outline"
                          className={`rounded-md text-[10px] uppercase ${severityBadge(c.severity)}`}
                        >
                          {t(severityKey(c.severity))}
                        </Badge>
                        {c.filesChangedUrl ? (
                          <a
                            href={c.filesChangedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            {t("score.filesChanged")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </div>
                      <p className="mt-1 text-slate-700">{c.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {result.questions_a_maintainer_would_ask.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            {t("score.questions")}
          </h2>
          <ul className="list-disc space-y-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-sm text-slate-700">
            {result.questions_a_maintainer_would_ask.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-center text-sm text-slate-600">
        {result.encouragement}
      </p>
    </div>
  );
}
