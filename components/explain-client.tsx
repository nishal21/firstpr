"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ExplainResponse = {
  owner: string;
  repo: string;
  headSha: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    htmlUrl: string;
    labels: string[];
  };
  files: { path: string; htmlUrl: string }[];
  filePickSource: "gemma" | "qwen" | "openai";
  explanation: {
    summary: string;
    whyTheseFiles: string;
    hintWhereToLook: string;
    concepts: string[];
  };
  learn: {
    title: string;
    link: string;
    snippet: string;
    site: string;
  }[] | null;
  error?: string;
  code?: string;
};

const FILE_PICK_LABELS: Record<ExplainResponse["filePickSource"], string> = {
  gemma: "Files picked by Gemma 4 on Neysa",
  qwen: "Files picked by Qwen 3.6 on Neysa",
  openai: "Files picked by OpenAI",
};

export function ExplainClient({
  initialOwner,
  initialRepo,
  initialIssueNumber,
}: {
  initialOwner: string;
  initialRepo: string;
  initialIssueNumber: number;
}) {
  const [owner, setOwner] = useState(initialOwner);
  const [repo, setRepo] = useState(initialRepo);
  const [issueNumber, setIssueNumber] = useState(String(initialIssueNumber));
  const [data, setData] = useState<ExplainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runExplain(next = { owner, repo, issueNumber }) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: next.owner,
            repo: next.repo,
            issueNumber: Number(next.issueNumber),
          }),
        });
        const json = (await res.json()) as ExplainResponse;
        if (!res.ok) {
          setData(null);
          setError(json.error || "Explain failed");
          return;
        }
        setData(json);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Explain failed");
      }
    });
  }

  useEffect(() => {
    runExplain({
      owner: initialOwner,
      repo: initialRepo,
      issueNumber: String(initialIssueNumber),
    });
    // Initial load only for the URL defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceLabel = data
    ? FILE_PICK_LABELS[data.filePickSource]
    : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex min-w-0 flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Explain an issue
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          FirstPR points at real files for a beginner issue. It never writes the
          fix.
        </p>
      </div>

      <form
        className="mb-8 flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          runExplain();
        }}
      >
        <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Owner
          <Input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className="min-h-11 h-11 w-full"
          />
        </label>
        <label className="flex w-full min-w-0 flex-1 flex-col gap-1 text-sm text-muted-foreground">
          Repo
          <Input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className="min-h-11 h-11 w-full"
          />
        </label>
        <label className="flex w-full min-w-0 flex-col gap-1 text-sm text-muted-foreground sm:w-28">
          Issue #
          <Input
            value={issueNumber}
            onChange={(e) => setIssueNumber(e.target.value)}
            inputMode="numeric"
            className="min-h-11 h-11 w-full"
          />
        </label>
        <Button
          type="submit"
          disabled={pending}
          className="min-h-11 h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          {pending ? "Explaining…" : "Explain"}
        </Button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="break-words">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11"
            onClick={() => runExplain()}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {pending && !data ? (
        <p className="text-sm text-muted-foreground">
          Loading issue and picking files…
        </p>
      ) : null}

      {data ? (
        <div className="flex min-w-0 flex-col gap-6">
          <div className="min-w-0 rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
              <a
                href={data.issue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 break-words text-lg font-semibold text-primary hover:underline"
              >
                #{data.issue.number} {data.issue.title}
              </a>
              {data.issue.labels.map((label) => (
                <Badge key={label} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-foreground break-words">
              {data.explanation.summary}
            </p>
            <p className="mt-3 text-sm text-muted-foreground break-words">
              {data.explanation.whyTheseFiles}
            </p>
            <p className="mt-2 text-sm text-muted-foreground break-words">
              {data.explanation.hintWhereToLook}
            </p>

            {data.learn && data.learn.length > 0 ? (
              <div className="mt-5 rounded-xl border border-border bg-muted/60 p-4">
                <h2 className="mb-3 text-sm font-semibold text-foreground">
                  Learn this first
                </h2>
                <ul className="flex flex-col gap-3">
                  {data.learn.map((item) => (
                    <li key={item.link} className="min-w-0 text-sm">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words font-medium text-primary hover:underline"
                      >
                        {item.title}
                      </a>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {item.site}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Search by SerpApi
                </p>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Where to look
            </h2>
            {data.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files selected.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.files.map((file) => (
                  <li key={file.path} className="min-w-0">
                    <div className="max-w-full overflow-x-auto rounded-md">
                      <a
                        href={file.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block font-mono text-sm text-primary hover:underline"
                      >
                        {file.path}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {sourceLabel ? (
              <p className="mt-3 text-xs text-muted-foreground">{sourceLabel}</p>
            ) : null}
          </div>

          <p className="text-sm text-muted-foreground">
            Demo shortcuts:{" "}
            <Link
              href="/explain?owner=nishal21&repo=NekoDroid&issue=4"
              className="inline-flex min-h-11 items-center text-primary hover:underline"
            >
              #4
            </Link>
            {" · "}
            <Link
              href="/explain?owner=nishal21&repo=NekoDroid&issue=5"
              className="inline-flex min-h-11 items-center text-primary hover:underline"
            >
              #5
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
