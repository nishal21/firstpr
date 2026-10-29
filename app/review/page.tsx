"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BookOpenText, CircleDot, FileDiff, GitPullRequestArrow } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ToolIntro } from "@/components/tool-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";
import { SavedResultDot } from "@/components/saved-result-dot";
import { ScoreCard } from "@/components/score-card";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { friendlyErrorMessage } from "@/lib/api-errors";
import { parseGitHubInput } from "@/lib/parse-github-input";
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

type DiffLinkResponse = {
  owner?: string;
  repo?: string;
  number?: number;
  diff?: string;
  issueNumber?: number | null;
  error?: string;
  code?: string;
};

type Tab = "pr" | "diff";

function subscribeQuery() {
  return () => {};
}

function readPrQuery(): string {
  return new URLSearchParams(window.location.search).get("pr")?.trim() ?? "";
}

/** A pasted PR, .diff or .patch link as a canonical github.com PR URL, else null. */
function pullLink(raw: string): { url: string; owner: string; repo: string; number: number } | null {
  const text = raw.trim();
  if (!text || /\s/.test(text)) return null;
  const parsed = parseGitHubInput(text);
  if (parsed.kind !== "pull") return null;
  return {
    url: `https://github.com/${parsed.owner}/${parsed.repo}/pull/${parsed.number}`,
    owner: parsed.owner,
    repo: parsed.repo,
    number: parsed.number,
  };
}

const fieldClass =
  "sticker-field mt-1.5 min-h-11 h-11 w-full rounded-none text-base md:text-sm";

export default function ReviewPage() {
  const t = useT();
  const queryPr = useSyncExternalStore(subscribeQuery, readPrQuery, () => "");
  const [tab, setTab] = useState<Tab>("pr");
  const [prUrl, setPrUrl] = useState("");
  const [appliedPr, setAppliedPr] = useState("");
  if (queryPr && queryPr !== appliedPr) {
    setAppliedPr(queryPr);
    setPrUrl(queryPr);
  }
  const [diff, setDiff] = useState("");
  const [repo, setRepo] = useState("");
  const [issueNumber, setIssueNumber] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffNote, setDiffNote] = useState<{ ok: boolean; text: string } | null>(null);
  const diffRequest = useRef(0);
  const [prProblem, setPrProblem] = useState(false);
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

  const [loadingSeen, setLoadingSeen] = useState(loading);
  if (loading !== loadingSeen) {
    setLoadingSeen(loading);
    if (loading) setStepIndex(0);
  }

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, loadingSteps.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading, loadingSteps.length]);

  /** The diff box got a PR or .diff link: load that diff and fill repo and issue. */
  async function loadDiffLink(link: NonNullable<ReturnType<typeof pullLink>>) {
    const id = ++diffRequest.current;
    setDiffLoading(true);
    setDiffNote(null);
    try {
      const res = await fetch("/api/review/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url }),
      });
      const json = (await res.json()) as DiffLinkResponse;
      if (id !== diffRequest.current) return;
      if (!res.ok || !json.diff) {
        setDiffNote({
          ok: false,
          text: friendlyErrorMessage(json.code, json.error || t("review.loadDiffFailed")),
        });
        return;
      }
      setDiff(json.diff);
      setRepo(`${link.owner}/${link.repo}`);
      if (json.issueNumber) setIssueNumber(String(json.issueNumber));
      setDiffNote({
        ok: true,
        text: t("review.loadedDiff", { ref: `${link.owner}/${link.repo}#${link.number}` }),
      });
    } catch {
      if (id === diffRequest.current) setDiffNote({ ok: false, text: t("review.loadDiffFailed") });
    } finally {
      if (id === diffRequest.current) setDiffLoading(false);
    }
  }

  function onDiffChange(next: string) {
    setDiff(next);
    const link = pullLink(next);
    if (link) void loadDiffLink(link);
    else if (diffNote && !diffNote.ok) setDiffNote(null);
  }

  async function run() {
    if (loading || diffLoading) return;
    let body: Record<string, unknown>;
    if (tab === "pr") {
      const link = pullLink(prUrl);
      if (!link) {
        setPrProblem(true);
        return;
      }
      body = { prUrl: link.url };
    } else {
      if (!diff.trim()) return;
      const link = pullLink(diff);
      if (link) return void loadDiffLink(link);
      body = {
        diff: diff.trim(),
        repo: repo.trim() || undefined,
        issueNumber: issueNumber.trim() ? Number(issueNumber.trim()) : undefined,
      };
    }

    setLoading(true);
    setError(null);
    setFromCache(false);
    setResult(null);

    try {
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
    } catch {
      setError(t("review.failed"));
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pr", label: t("review.tabPr") },
    { id: "diff", label: t("review.tabDiff") },
  ];

  return (
    <>
    <ToolIntro
      icon={GitPullRequestArrow}
      step={`${t("steps.step", { n: 3 })} · ${t("flow.review")}`}
      title={t("review.title")}
      subtitle={t("review.subtitle")}
      chipsLabel={t("review.checksLabel")}
      chips={[
        { icon: CircleDot, label: t("review.checkIssue") },
        { icon: BookOpenText, label: "CONTRIBUTING.md" },
        { icon: FileDiff, label: t("review.checkDiff") },
      ]}
    />
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
      <form
        className="ink-card min-w-0 p-4 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <div role="tablist" aria-label={t("review.title")} className="sticker-seg w-full sm:w-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`review-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`review-panel-${item.id}`}
              className="sticker-seg-option flex-1 sm:flex-none"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "pr" ? (
          <div role="tabpanel" id="review-panel-pr" aria-labelledby="review-tab-pr" className="mt-5">
            <label className="block text-sm font-semibold text-foreground">
              {t("review.prUrl")}
              <Input
                className={fieldClass}
                placeholder={t("review.prUrlPlaceholder")}
                value={prUrl}
                onChange={(e) => {
                  setPrUrl(e.target.value);
                  setPrProblem(false);
                }}
                disabled={loading}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={prProblem || undefined}
              />
            </label>
            <p className={cn("mt-2 text-sm", prProblem ? "text-destructive" : "text-foreground/70")} role={prProblem ? "alert" : undefined}>
              {prProblem ? t("review.prUrlInvalid") : t("review.prUrlHelp")}
            </p>
          </div>
        ) : (
          <div role="tabpanel" id="review-panel-diff" aria-labelledby="review-tab-diff" className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-foreground">
              {t("review.diff")}
              <Textarea
                className="sticker-field font-plex mt-1.5 min-h-44 max-h-80 w-full max-w-full overflow-auto rounded-none text-[13px] leading-relaxed [field-sizing:fixed]"
                placeholder={t("review.diffPlaceholder")}
                value={diff}
                onChange={(e) => onDiffChange(e.target.value)}
                disabled={loading || diffLoading}
                spellCheck={false}
              />
            </label>
            <p
              className={cn(
                "flex min-h-5 items-center gap-2 text-sm",
                diffNote && !diffNote.ok ? "text-destructive" : "text-foreground/70",
              )}
              aria-live="polite"
            >
              {diffLoading ? (
                <>
                  <Spinner />
                  {t("review.loadingDiff")}
                </>
              ) : diffNote ? (
                <span className={cn(diffNote.ok && "check-chip")}>{diffNote.text}</span>
              ) : (
                t("review.diffHelp")
              )}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block min-w-0 text-sm font-semibold text-foreground">
                {t("review.repo")}
                <Input
                  className={fieldClass}
                  placeholder={t("review.repoPlaceholder")}
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={loading}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className="block min-w-0 text-sm font-semibold text-foreground">
                {t("review.issueNumber")}
                <Input
                  className={fieldClass}
                  placeholder={t("review.issuePlaceholder")}
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value.replace(/[^\d]/g, ""))}
                  disabled={loading}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={cn(arrowPillClass, "mt-6 w-full sm:w-auto")}
          disabled={
            loading || diffLoading || (tab === "pr" ? !prUrl.trim() : !diff.trim())
          }
        >
          {loading ? t("review.running") : t("review.submit")}
          {loading ? (
            <span className="inline-flex items-center">
              <Spinner className="text-white" />
            </span>
          ) : (
            <ArrowBubble />
          )}
        </button>
      </form>

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
        <div className="ink-card mt-8 p-5" role="alert">
          <p className="text-sm font-medium break-words">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="sticker-pill mt-3 rounded-none"
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
