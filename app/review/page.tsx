"use client";

import { useEffect, useState } from "react";
import { ScoreCard } from "@/components/score-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewResult } from "@/lib/review-format";

const LOADING_STEPS = [
  "Reading your PR",
  "Reading CONTRIBUTING.md",
  "Checking against the issue",
  "Reviewing the diff",
] as const;

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

  useEffect(() => {
    if (!loading) return;
    setStepIndex(0);
    const t = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(t);
  }, [loading]);

  async function run() {
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
        setError(json.error || "Review failed");
        return;
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Review my PR
      </h1>
      <p className="mt-2 text-slate-600">
        Paste a pull request URL or a diff. FirstPR scores it against the
        linked issue, CONTRIBUTING.md, and the change itself — without writing
        your fix.
      </p>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className="mb-4 w-full sm:w-auto">
            <TabsTrigger value="pr">PR link</TabsTrigger>
            <TabsTrigger value="diff">Paste a diff</TabsTrigger>
          </TabsList>

          <TabsContent value="pr" className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Pull request URL
              <Input
                className="mt-1.5 rounded-lg"
                placeholder="https://github.com/owner/repo/pull/123"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                disabled={loading}
              />
            </label>
          </TabsContent>

          <TabsContent value="diff" className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Unified diff
              <Textarea
                className="mt-1.5 min-h-40 rounded-lg font-mono text-xs"
                placeholder="diff --git a/…"
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                disabled={loading}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Repo (optional)
                <Input
                  className="mt-1.5 rounded-lg"
                  placeholder="owner/repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  disabled={loading}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Issue number (optional)
                <Input
                  className="mt-1.5 rounded-lg"
                  placeholder="4"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  disabled={loading}
                />
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <Button
          type="button"
          className="mt-5 w-full rounded-lg bg-blue-600 hover:bg-blue-700 sm:w-auto"
          onClick={run}
          disabled={
            loading ||
            (tab === "pr" ? !prUrl.trim() : !diff.trim())
          }
        >
          {loading ? "Running…" : "Run maintainer-ready check"}
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-900">
            {LOADING_STEPS[stepIndex]}
          </p>
          <ul className="space-y-2">
            {LOADING_STEPS.map((step, i) => (
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
      ) : null}

      {error ? (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm text-red-800">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 rounded-lg"
            onClick={run}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {result && !loading ? (
        <div className="mt-10">
          {result.pr?.htmlUrl ? (
            <p className="mb-4 text-sm text-slate-500">
              Reviewing{" "}
              <a
                href={result.pr.htmlUrl}
                className="text-blue-600 hover:underline"
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
