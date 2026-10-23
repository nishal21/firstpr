"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { useT } from "@/components/language-provider";
import { SavedResultDot } from "@/components/saved-result-dot";
import { Spinner } from "@/components/spinner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyErrorMessage } from "@/lib/api-errors";
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
  difficulty?: "easy" | "medium" | "hard";
  difficultyBadge?: string;
  difficultyReason?: string;
};

type MatchResponse = {
  languages: string[];
  picked: IssueCard | null;
  others: IssueCard[];
  skipped: IssueCard[];
  error?: string;
  code?: string;
};

export function MatchForm() {
  const t = useT();
  const [username, setUsername] = useState("");
  const [repo, setRepo] = useState("nishal21/NekoDroid");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [pending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);

  const progressSteps = [
    t("match.progress.repos"),
    t("match.progress.issues"),
    t("match.progress.skip"),
  ] as const;

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
    setFromCache(false);
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
          setFromCache(false);
          setError(
            friendlyErrorMessage(json.code, json.error || t("match.failed")),
          );
          return;
        }
        setFromCache(res.headers.get("x-firstpr-source") === "cache");
        setData(json);
      } catch {
        setData(null);
        setFromCache(false);
        setError(t("match.failed"));
      }
    });
  }

  const noIssues =
    data && !pending && !data.picked && data.others.length === 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending && username.trim()) runMatch();
        }}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex w-full flex-1 flex-col gap-1.5 text-sm text-slate-600">
            {t("match.username")}
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("match.usernamePlaceholder")}
              required
              autoComplete="username"
              disabled={pending}
              className="h-10 w-full rounded-xl border-slate-200 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
            />
          </label>
          <label className="flex w-full flex-1 flex-col gap-1.5 text-sm text-slate-600">
            {t("match.repo")}
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder={t("match.repoPlaceholder")}
              disabled={pending}
              className="h-10 w-full rounded-xl border-slate-200 focus-visible:border-blue-600 focus-visible:ring-blue-600/30"
            />
          </label>
          <Button
            type="submit"
            disabled={pending || !username.trim()}
            className="h-10 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/40 sm:w-auto sm:shrink-0"
          >
            {pending ? (
              <>
                <Spinner className="text-white" />
                {t("match.finding")}
              </>
            ) : (
              t("match.submit")
            )}
          </Button>
        </div>
      </form>

      {pending ? (
        <div className="flex flex-col gap-6">
          <ol className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            {progressSteps.map((label, i) => (
              <li
                key={label}
                className={`flex items-center gap-2 py-1.5 ${
                  i <= stepIndex ? "text-slate-900" : "text-slate-400"
                }`}
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    i <= stepIndex ? "bg-blue-600" : "bg-slate-300"
                  }`}
                />
                {label}
                {i === stepIndex ? "…" : null}
              </li>
            ))}
          </ol>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Skeleton className="h-6 w-2/3 rounded-lg bg-slate-100" />
            <Skeleton className="h-4 w-full rounded-lg bg-slate-100" />
            <Skeleton className="h-4 w-5/6 rounded-lg bg-slate-100" />
            <Skeleton className="mt-2 h-10 w-40 rounded-xl bg-slate-100" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-xl border-slate-200"
            onClick={runMatch}
          >
            {t("match.retry")}
          </Button>
        </div>
      ) : null}

      {data && !pending ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{t("match.youWrite")}</span>
            {data.languages.length === 0 ? (
              <span className="text-slate-500">{t("match.noPublicRepos")}</span>
            ) : (
              data.languages.map((lang) => (
                <Badge
                  key={lang}
                  variant="secondary"
                  className="rounded-md border border-slate-200"
                >
                  {lang}
                </Badge>
              ))
            )}
          </div>

          {data.picked ? (
            <article className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <SavedResultDot show={fromCache} />
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {data.picked.difficultyBadge ? (
                  <DifficultyBadge label={data.picked.difficultyBadge} />
                ) : null}
                <a
                  href={data.picked.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-lg font-semibold text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600/40 sm:text-xl"
                >
                  #{data.picked.number} {data.picked.title}
                </a>
                {data.picked.labels.map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="rounded-md border border-slate-200"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
              <p className="text-slate-600">{data.picked.fitReason}</p>
              {data.picked.difficultyReason ? (
                <p className="mt-1 text-xs text-slate-500">
                  {data.picked.difficultyReason}
                </p>
              ) : null}
              <Link
                href={`/issue/${data.picked.owner}/${data.picked.repo}/${data.picked.number}`}
                className={cn(
                  buttonVariants(),
                  "mt-4 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600/40",
                )}
              >
                {t("match.explainIssue")}
              </Link>
            </article>
          ) : noIssues ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              {t("match.noIssuesBefore")}
              <Link
                href="/"
                className="font-medium text-blue-600 hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  setRepo("nishal21/NekoDroid");
                }}
              >
                nishal21/NekoDroid
              </Link>
              {t("match.noIssuesAfter")}
            </p>
          ) : null}

          {data.others.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                {t("match.otherFits")}
              </h2>
              {data.others.map((issue) => (
                <article
                  key={`${issue.owner}/${issue.repo}#${issue.number}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {issue.difficultyBadge ? (
                      <DifficultyBadge label={issue.difficultyBadge} />
                    ) : null}
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                      #{issue.number} {issue.title}
                    </a>
                    {issue.labels.map((label) => (
                      <Badge key={label} variant="outline" className="rounded-md">
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500">{issue.fitReason}</p>
                  <Link
                    href={`/issue/${issue.owner}/${issue.repo}/${issue.number}`}
                    className="mt-2 inline-block text-sm text-blue-600 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-600/40"
                  >
                    {t("match.explainIssue")}
                  </Link>
                </article>
              ))}
            </div>
          ) : null}

          {data.skipped.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                {t("match.alreadyTaken")}
              </h2>
              {data.skipped.map((issue) => (
                <article
                  key={`skip-${issue.owner}/${issue.repo}#${issue.number}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-80"
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
