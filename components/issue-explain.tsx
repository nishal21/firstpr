"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type ExplainApiResponse = {
  owner: string;
  repo: string;
  sha: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    htmlUrl: string;
    labels: string[];
  };
  explanation: {
    summary: string;
    why_it_matters: string;
    files: unknown[];
    concepts: { term: string; explanation: string }[];
    done_when: string[];
    how_to_check: string[];
    confidence: "high" | "medium" | "low";
    unsure_about: string | null;
  };
  citations: {
    path: string;
    start: number;
    end: number;
    url: string;
    why: string;
    verified: true;
  }[];
  droppedCitations: number;
  error?: string;
  code?: string;
};

const LOADING_STEPS = [
  "Reading the issue",
  "Finding the files that matter",
  "Checking every line reference",
] as const;

function lineRangeLabel(start: number, end: number): string {
  return start === end ? `L${start}` : `L${start}–L${end}`;
}

export function IssueExplain({
  owner,
  repo,
  number,
  lang,
}: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}) {
  const [data, setData] = useState<ExplainApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stepTimer: ReturnType<typeof setInterval> | undefined;

    async function run() {
      setLoading(true);
      setError(null);
      setData(null);
      setStepIndex(0);
      stepTimer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
      }, 2200);

      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, number, lang: lang ?? undefined }),
        });
        const json = (await res.json()) as ExplainApiResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Explain failed");
          setData(null);
          return;
        }
        setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Explain failed");
          setData(null);
        }
      } finally {
        if (stepTimer) clearInterval(stepTimer);
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (stepTimer) clearInterval(stepTimer);
    };
  }, [owner, repo, number, lang]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="mb-6 text-sm font-medium text-blue-600">
          {LOADING_STEPS[stepIndex]}…
        </p>
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 bg-slate-100" />
          <Skeleton className="h-24 w-full rounded-xl bg-slate-100" />
          <Skeleton className="h-24 w-full rounded-xl bg-slate-100" />
          <Skeleton className="h-40 w-full rounded-xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-700">{error || "Something went wrong."}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const { issue, explanation, citations } = data;
  const showUnsure =
    explanation.confidence === "low" || explanation.unsure_about != null;

  return (
    <section className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span>
            {owner}/{repo}
          </span>
          <span aria-hidden>·</span>
          <a
            href={issue.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            #{issue.number}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {issue.title}
        </h1>
        {issue.labels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {issue.labels.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="rounded-md border border-slate-200 bg-slate-50 font-normal text-slate-700"
              >
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </header>

      {showUnsure ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {explanation.unsure_about?.trim() ||
            "Confidence is low for this explanation. Double-check the files on GitHub before you start."}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            What this issue is asking
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {explanation.summary}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Why it matters</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {explanation.why_it_matters}
          </p>
        </div>
      </div>

      {explanation.concepts.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Words you might not know
          </h2>
          <dl className="mt-3 divide-y divide-slate-100">
            {explanation.concepts.map((c) => (
              <div
                key={c.term}
                className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4"
              >
                <dt className="text-sm font-medium text-slate-900">{c.term}</dt>
                <dd className="text-sm text-slate-600">{c.explanation}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Where to look</h2>
        {citations.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            No verified line references yet. Open the issue and explore the repo
            tree.
          </p>
        ) : (
          <ul className="space-y-3">
            {citations.map((c) => (
              <li
                key={`${c.path}:${c.start}-${c.end}:${c.why}`}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-medium text-slate-900">
                      {c.path}{" "}
                      <span className="font-normal text-slate-500">
                        {lineRangeLabel(c.start, c.end)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{c.why}</p>
                  </div>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-blue-600 hover:bg-slate-50"
                  >
                    Open on GitHub
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700">
                  <Check className="size-3.5" aria-hidden />
                  Checked against the real file
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">You&apos;re done when</h2>
          {explanation.done_when.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {explanation.done_when.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No checklist items yet.</p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            How to check your work
          </h2>
          {explanation.how_to_check.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {explanation.how_to_check.map((cmd) => (
                <code
                  key={cmd}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-800"
                >
                  {cmd}
                </code>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No commands listed in CONTRIBUTING for this change.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Hints</h2>
        <p className="mt-2 text-sm text-slate-500">
          Hint ladder coming next — where to look, what to change, then
          plain-English pseudocode. FirstPR never writes the fix for you.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        <Link href="/" className="text-blue-600 hover:underline">
          Find another issue
        </Link>
      </p>
    </section>
  );
}
