"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink } from "lucide-react";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { FlowProgress } from "@/components/flow-steps";
import { HintLadder } from "@/components/hint-ladder";
import { useT } from "@/components/language-provider";
import { SavedResultDot } from "@/components/saved-result-dot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyErrorMessage } from "@/lib/api-errors";

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
  language?: string | null;
  learn: {
    title: string;
    link: string;
    snippet: string;
    site: string;
  }[] | null;
  difficulty?: "easy" | "medium" | "hard";
  difficultyBadge?: string;
  difficultyReason?: string;
  error?: string;
  code?: string;
};

function lineRangeLabel(start: number, end: number): string {
  return start === end ? `L${start}` : `L${start}–L${end}`;
}

export function IssueExplain({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}) {
  const t = useT();
  const [data, setData] = useState<ExplainApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);

  const loadingSteps = [
    t("explain.loading.issue"),
    t("explain.loading.files"),
    t("explain.loading.lines"),
  ] as const;

  useEffect(() => {
    let cancelled = false;
    let stepTimer: ReturnType<typeof setInterval> | undefined;

    async function run() {
      setLoading(true);
      setError(null);
      setData(null);
      setFromCache(false);
      setStepIndex(0);
      stepTimer = setInterval(() => {
        setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
      }, 2200);

      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, number }),
        });
        const json = (await res.json()) as ExplainApiResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError(
            friendlyErrorMessage(json.code, json.error || t("explain.failed")),
          );
          setData(null);
          setFromCache(false);
          return;
        }
        setFromCache(res.headers.get("x-firstpr-source") === "cache");
        setData(json);
      } catch {
        if (!cancelled) {
          setError(t("explain.failed"));
          setData(null);
          setFromCache(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- UI lang must not refetch AI
  }, [owner, repo, number]);

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <FlowProgress current="explain" />
        <p className="mb-6 text-sm font-medium text-blue-600">
          {loadingSteps[stepIndex]}…
        </p>
        <div className="space-y-6">
          <Skeleton className="h-8 w-2/3 rounded-lg bg-slate-100" />
          <Skeleton className="h-4 w-40 rounded-lg bg-slate-100" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-xl bg-slate-100" />
            <Skeleton className="h-28 w-full rounded-xl bg-slate-100" />
          </div>
          <Skeleton className="h-40 w-full rounded-xl bg-slate-100" />
          <Skeleton className="h-32 w-full rounded-xl bg-slate-100" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <FlowProgress current="explain" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            {error || t("explain.somethingWrong")}
          </p>
          <Button
            className="mt-4 rounded-xl border-slate-200"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            {t("explain.retry")}
          </Button>
        </div>
      </section>
    );
  }

  const { issue, explanation, citations } = data;
  const limitsNotice = explanation.unsure_about?.trim() || null;

  return (
    <section className="relative mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6">
      <SavedResultDot show={fromCache} className="pointer-events-none absolute right-4 top-4 size-1.5 rounded-full bg-slate-300 sm:right-6" />
      <FlowProgress current="explain" />
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
          {data.difficultyBadge ? (
            <DifficultyBadge label={data.difficultyBadge} />
          ) : null}
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

      {limitsNotice ? (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {limitsNotice}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.whatAsking")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {explanation.summary}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.whyMatters")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {explanation.why_it_matters}
          </p>
        </div>
      </div>

      {explanation.concepts.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.words")}
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

      {data.learn && data.learn.length >= 2 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.learnFirst")}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {data.learn.map((item) => (
              <li key={item.link} className="text-sm">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline"
                >
                  {item.title}
                </a>
                <span className="ml-2 text-xs text-slate-400">{item.site}</span>
                {item.snippet ? (
                  <p className="mt-0.5 text-xs text-slate-500">{item.snippet}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">
            {t("explain.searchBySerpapi")}
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          {t("explain.whereLook")}
        </h2>
        {citations.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            {t("explain.noCitations")}
          </p>
        ) : (
          <ul className="space-y-3">
            {citations.map((c) => (
              <li
                key={`${c.path}:${c.start}-${c.end}:${c.why}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
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
                    {t("explain.openOnGithub")}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-700">
                  <Check className="size-3.5" aria-hidden />
                  {t("explain.checkedFile")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.doneWhen")}
          </h2>
          {explanation.done_when.length > 0 ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
              {explanation.done_when.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {t("explain.noChecklist")}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {t("explain.howCheck")}
          </h2>
          {explanation.how_to_check.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {explanation.how_to_check.map((cmd) => (
                <code
                  key={cmd}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs break-all text-slate-800"
                >
                  {cmd}
                </code>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              {t("explain.noCommands")}
            </p>
          )}
        </div>
      </div>

      <HintLadder owner={owner} repo={repo} number={number} />

      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6 text-sm">
        <Link
          href="/"
          className="text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          {t("explain.findAnother")}
        </Link>
        <Link
          href="/review"
          className="rounded-xl bg-blue-600 px-4 py-2 font-medium text-white outline-none hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          {t("explain.reviewPr")}
        </Link>
      </div>
    </section>
  );
}
