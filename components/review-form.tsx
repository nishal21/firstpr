"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { GitPullRequestArrow } from "lucide-react";
import { useT } from "@/components/language-provider";
import { PageIntro } from "@/components/page-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";
import { SavedResultDot } from "@/components/saved-result-dot";
import { ScoreCard } from "@/components/score-card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { friendlyErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import {
  pushReviewHistory,
  readReviewHistorySnapshot,
  recordJourney,
  subscribeReviewHistory,
  type ReviewHistoryItem,
} from "@/lib/journey";
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
  const searchParams = useSearchParams();
  const [prUrl, setPrUrl] = useState(() => searchParams.get("pr")?.trim() ?? "");
  const [diff, setDiff] = useState("");
  const [repo, setRepo] = useState("");
  const historyRaw = useSyncExternalStore(
    subscribeReviewHistory,
    readReviewHistorySnapshot,
    () => "",
  );
  const history: ReviewHistoryItem[] = (() => {
    if (!historyRaw) return [];
    try {
      const parsed = JSON.parse(historyRaw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((row): row is ReviewHistoryItem => {
        if (!row || typeof row !== "object") return false;
        const item = row as Partial<ReviewHistoryItem>;
        return (
          typeof item.at === "string" &&
          typeof item.label === "string" &&
          typeof item.href === "string" &&
          typeof item.score === "number" &&
          typeof item.verdict === "string"
        );
      });
    } catch {
      return [];
    }
  })();
  const [issueNumber, setIssueNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [result, setResult] = useState<ReviewApiResponse | null>(null);

  const loadingSteps = [
    t("review.loading.pr"),
    t("review.loading.contributing"),
    t("review.loading.issue"),
    t("review.loading.diff"),
  ] as const;

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading, loadingSteps.length]);

  async function run() {
    if (loading) return;
    if (tab === "pr" ? !prUrl.trim() : !diff.trim()) return;

    setStepIndex(0);
    setLoading(true);
    setError(null);
    setFromCache(false);
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
        setError(
          friendlyErrorMessage(json.code, json.error || t("review.failed")),
        );
        return;
      }
      setFromCache(res.headers.get("x-firstpr-source") === "cache");
      setResult(json);
      track("review");
      const label = json.pr?.title || prUrl || "Pasted diff";
      const href = json.pr?.htmlUrl || prUrl || "/review";
      pushReviewHistory({
        at: new Date().toISOString(),
        label,
        href,
        score: json.score,
        verdict: json.verdict,
      });
      recordJourney({
        kind: "review",
        title: label,
        href,
        detail: `${json.score}/100`,
      });
    } catch {
      setError(t("review.failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <PageIntro
      eyebrow={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-accent-foreground backdrop-blur">
          <GitPullRequestArrow className="size-4 text-primary" aria-hidden />
          {t("steps.step", { n: 3 })} · {t("flow.review")}
        </span>
      }
      title={t("review.title")}
      subtitle={t("review.subtitle")}
    />
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <form
        className="min-w-0 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <div className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList
              variant="line"
              className="inline-flex h-auto min-h-11 w-max max-w-none sm:w-auto"
            >
              <TabsTrigger
                value="pr"
                className="min-h-11 flex-none px-4 sm:flex-none"
              >
                {t("review.tabPr")}
              </TabsTrigger>
              <TabsTrigger
                value="diff"
                className="min-h-11 flex-none px-4 sm:flex-none"
              >
                {t("review.tabDiff")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pr" className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t("review.prUrl")}
              <Input
                className="mt-1.5 min-h-11 h-11 w-full rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
                placeholder={t("review.prUrlPlaceholder")}
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                disabled={loading}
              />
            </label>
          </TabsContent>

          <TabsContent value="diff" className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t("review.diff")}
              <Textarea
                className="mt-1.5 min-h-40 w-full max-w-full overflow-x-auto rounded-xl border-border font-mono text-sm focus-visible:border-primary focus-visible:ring-ring/30"
                placeholder={t("review.diffPlaceholder")}
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                disabled={loading}
              />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-medium text-foreground">
                {t("review.repo")}
                <Input
                  className="mt-1.5 min-h-11 h-11 w-full rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
                  placeholder={t("review.repoPlaceholder")}
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={loading}
                />
              </label>
              <label className="block min-w-0 text-sm font-medium text-foreground">
                {t("review.issueNumber")}
                <Input
                  className="mt-1.5 min-h-11 h-11 w-full rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
                  placeholder={t("review.issuePlaceholder")}
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <button
          type="submit"
          className={cn(arrowPillClass, "mt-5 w-full sm:w-auto")}
          disabled={
            loading || (tab === "pr" ? !prUrl.trim() : !diff.trim())
          }
        >
          {loading ? t("review.running") : t("review.submit")}
          {loading ? (
            <span className="flex size-9 items-center justify-center rounded-full bg-white">
              <Spinner className="text-primary" />
            </span>
          ) : (
            <ArrowBubble />
          )}
        </button>
      </form>

      {history.length > 0 ? (
        <div className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">{t("review.history")}</h2>
          <ul className="mt-3 space-y-2">
            {history.map((item) => (
              <li key={`${item.href}-${item.at}`} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{item.score}/100</span>
                {" · "}
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{t("review.historyEmpty")}</p>
      )}

      {loading ? (
        <div className="mt-10 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium text-primary">
              {loadingSteps[stepIndex]}…
            </p>
            <ul className="mt-3 space-y-2">
              {loadingSteps.map((step, i) => (
                <li
                  key={step}
                  className={`text-sm break-words ${
                    i <= stepIndex
                      ? "text-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {i < stepIndex ? "✓ " : i === stepIndex ? "→ " : "  "}
                  {step}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:p-8">
            <Skeleton className="size-36 shrink-0 rounded-full bg-muted" />
            <div className="w-full min-w-0 space-y-3">
              <Skeleton className="h-6 w-32 rounded-lg bg-muted" />
              <Skeleton className="h-4 w-full rounded-lg bg-muted" />
              <Skeleton className="h-4 w-5/6 rounded-lg bg-muted" />
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-12 w-full rounded-lg bg-muted" />
            <Skeleton className="h-12 w-full rounded-lg bg-muted" />
            <Skeleton className="h-12 w-full rounded-lg bg-muted" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-800 break-words">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 rounded-xl border-border"
            onClick={() => void run()}
          >
            {t("review.retry")}
          </Button>
        </div>
      ) : null}

      {result && !loading ? (
        <div className="relative mt-10 min-w-0">
          <SavedResultDot show={fromCache} />
          {result.pr?.htmlUrl ? (
            <p className="mb-4 text-sm text-muted-foreground break-words">
              {t("review.reviewing")}{" "}
              <a
                href={result.pr.htmlUrl}
                className="text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
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
    </>
  );
}
