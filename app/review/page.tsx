"use client";

import { useEffect, useState } from "react";
import { FlowProgress } from "@/components/flow-steps";
import { useT } from "@/components/language-provider";
import { ScoreCard } from "@/components/score-card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewResult } from "@/lib/review-format";

type ReviewApiResponse = ReviewResult & {
  error?: string;
  code?: string;
  mode?: "pr" | "diff";
  owner?: string | null;
  repo?: string | null;
  number?: number;
  pr?: { title: string; htmlUrl: string };
};

export default function ReviewPage() {
  const t = useT();
  const [tab, setTab] = useState("pr");
  const [prUrl, setPrUrl] = useState(
    "https://github.com/nishal21/NekoDroid/pull/7",
  );
  const [diff, setDiff] = useState("");
  const [repo, setRepo] = useState("nishal21/NekoDroid");
  const [issueNumber, setIssueNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewApiResponse | null>(null);

  const loadingSteps = [
    t("review.loading.pr"),
    t("review.loading.contributing"),
    t("review.loading.issue"),
    t("review.loading.diff"),
  ] as const;

  useEffect(() => {
    if (!loading) return;
    setStepIndex(0);
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading, loadingSteps.length]);

  async function run() {
    if (loading) return;
    if (tab === "pr" ? !prUrl.trim() : !diff.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body =
        tab === "pr"
          ? { prUrl: prUrl.trim() }
          : {
              diff: diff.trim(),
              repo: repo.trim() || undefined,
              issueNumber: issueNumber.trim()
                ? Number(issueNumber.trim())
                : undefined,
            };

      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ReviewApiResponse;
      if (!res.ok) {
        setError(json.error || t("review.failed"));
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("review.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <FlowProgress current="review" />

      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {t("review.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-600">{t("review.subtitle")}</p>

      <form
        className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList variant="line" className="mb-4 w-full max-w-full sm:w-auto">
            <TabsTrigger value="pr" className="flex-1 sm:flex-none">
              {t("review.tabPr")}
            </TabsTrigger>
            <TabsTrigger value="diff" className="flex-1 sm:flex-none">
              {t("review.tabDiff")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pr" className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t("review.prUrl")}
              <Input
                className="mt-1.5 h-10 w-full rounded-xl border-slate-200 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
                placeholder={t("review.prUrlPlaceholder")}
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                disabled={loading}
              />
            </label>
          </TabsContent>

          <TabsContent value="diff" className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t("review.diff")}
              <Textarea
                className="mt-1.5 min-h-40 w-full rounded-xl border-slate-200 font-mono text-xs focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
                placeholder={t("review.diffPlaceholder")}
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                disabled={loading}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                {t("review.repo")}
                <Input
                  className="mt-1.5 h-10 w-full rounded-xl border-slate-200 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
                  placeholder={t("review.repoPlaceholder")}
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={loading}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t("review.issueNumber")}
                <Input
                  className="mt-1.5 h-10 w-full rounded-xl border-slate-200 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
                  placeholder={t("review.issuePlaceholder")}
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          type="submit"
          className="mt-5 h-10 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/40 sm:w-auto"
          disabled={
            loading || (tab === "pr" ? !prUrl.trim() : !diff.trim())
          }
        >
          {loading ? (
            <>
              <Spinner className="text-white" />
              {t("review.running")}
            </>
          ) : (
            t("review.submit")
          )}
        </Button>
      </form>

      {loading ? (
        <div className="mt-10 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-600">
              {loadingSteps[stepIndex]}…
            </p>
            <ul className="mt-3 space-y-2">
              {loadingSteps.map((step, i) => (
                <li
                  key={step}
                  className={`text-sm ${
                    i <= stepIndex ? "text-slate-800" : "text-slate-400"
                  }`}
                >
                  {i < stepIndex ? "✓ " : i === stepIndex ? "→ " : "  "}
                  {step}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:flex-row sm:items-start">
            <Skeleton className="size-36 shrink-0 rounded-full bg-slate-100" />
            <div className="w-full space-y-3">
              <Skeleton className="h-6 w-32 rounded-lg bg-slate-100" />
              <Skeleton className="h-4 w-full rounded-lg bg-slate-100" />
              <Skeleton className="h-4 w-5/6 rounded-lg bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-12 w-full rounded-lg bg-slate-100" />
            <Skeleton className="h-12 w-full rounded-lg bg-slate-100" />
            <Skeleton className="h-12 w-full rounded-lg bg-slate-100" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-xl border-slate-200"
            onClick={() => void run()}
          >
            {t("review.retry")}
          </Button>
        </div>
      ) : null}

      {result && !loading ? (
        <div className="mt-10">
          {result.pr?.htmlUrl ? (
            <p className="mb-4 text-sm text-slate-500">
              {t("review.reviewing")}{" "}
              <a
                href={result.pr.htmlUrl}
                className="text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600/40"
                target="_blank"
                rel="noreferrer"
              >
                {result.pr.title}
              </a>
            </p>
          ) : null}
          <ScoreCard result={result} />
        </div>
      ) : null}
    </section>
  );
}
