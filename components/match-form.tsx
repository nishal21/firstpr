"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type IssueCard = {
  number: number;
  title: string;
  labels: string[];
  htmlUrl: string;
  owner: string;
  repo: string;
  fitReason?: string;
  reason?: string;
  score?: number;
};

type MatchResponse = {
  languages: string[];
  picked: IssueCard | null;
  others: IssueCard[];
  skipped: IssueCard[];
  error?: string;
};

const PROGRESS_STEPS = [
  "Reading your public repos",
  "Finding open good first issues",
  "Skipping ones already taken",
] as const;

export function MatchForm() {
  const [username, setUsername] = useState("");
  const [repo, setRepo] = useState("nishal21/NekoDroid");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!pending) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const t1 = window.setTimeout(() => setStepIndex(1), 700);
    const t2 = window.setTimeout(() => setStepIndex(2), 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pending]);

  function runMatch() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            repo: repo.trim(),
          }),
        });
        const json = (await res.json()) as MatchResponse;
        if (!res.ok) {
          setData(null);
          setError(json.error || "Match failed");
          return;
        }
        setData(json);
      } catch (err) {
        setData(null);
        setError(err instanceof Error ? err.message : "Match failed");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 sm:px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runMatch();
        }}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
            GitHub username
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="octocat"
              required
              autoComplete="username"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm text-slate-600">
            Repo (optional)
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="nishal21/NekoDroid"
            />
          </label>
          <Button
            type="submit"
            disabled={pending || !username.trim()}
            className="bg-blue-600 hover:bg-blue-700 sm:mb-0.5"
          >
            {pending ? "Finding…" : "Find my first issue"}
          </Button>
        </div>
      </form>

      {pending ? (
        <ol className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
          {PROGRESS_STEPS.map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-2 py-1.5 ${
                i <= stepIndex ? "text-slate-900" : "text-slate-400"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  i <= stepIndex ? "bg-blue-600" : "bg-slate-300"
                }`}
              />
              {label}
              {i === stepIndex ? "…" : null}
            </li>
          ))}
        </ol>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={runMatch}>
            Retry
          </Button>
        </div>
      ) : null}

      {data && !pending ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>You write:</span>
            {data.languages.length === 0 ? (
              <span className="text-slate-400">No public languages yet</span>
            ) : (
              data.languages.map((lang) => (
                <Badge key={lang} variant="secondary">
                  {lang}
                </Badge>
              ))
            )}
          </div>

          {data.picked ? (
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <a
                  href={data.picked.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xl font-semibold text-blue-600 hover:underline"
                >
                  #{data.picked.number} {data.picked.title}
                </a>
                {data.picked.labels.map((label) => (
                  <Badge key={label} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
              <p className="text-slate-600">{data.picked.fitReason}</p>
              <Link
                href={`/issue/${data.picked.owner}/${data.picked.repo}/${data.picked.number}`}
                className={cn(
                  buttonVariants(),
                  "mt-4 bg-blue-600 text-white hover:bg-blue-700",
                )}
              >
                Explain this issue
              </Link>
            </article>
          ) : (
            <p className="text-sm text-slate-500">
              No open unassigned good first issues matched.
            </p>
          )}

          {data.others.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Other fits
              </h2>
              {data.others.map((issue) => (
                <article
                  key={`${issue.owner}/${issue.repo}#${issue.number}`}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      #{issue.number} {issue.title}
                    </a>
                    {issue.labels.map((label) => (
                      <Badge key={label} variant="outline">
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">{issue.fitReason}</p>
                  <Link
                    href={`/issue/${issue.owner}/${issue.repo}/${issue.number}`}
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Explain this issue
                  </Link>
                </article>
              ))}
            </div>
          ) : null}

          {data.skipped.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Already taken
              </h2>
              {data.skipped.map((issue) => (
                <article
                  key={`skip-${issue.owner}/${issue.repo}#${issue.number}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70"
                >
                  <p className="font-medium text-slate-500">
                    #{issue.number} {issue.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">{issue.reason}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
