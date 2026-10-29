"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AlgoliaMark } from "@/components/algolia-mark";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { useT } from "@/components/language-provider";
import { SavedResultDot } from "@/components/saved-result-dot";
import { Spinner } from "@/components/spinner";
import { Badge } from "@/components/ui/badge";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { friendlyErrorMessage } from "@/lib/api-errors";
import { track } from "@/lib/analytics";
import type { Availability } from "@/lib/availability";
import { recordJourney } from "@/lib/journey";
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
  availability?: Availability;
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
  const [repo, setRepo] = useState("");
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<
    { title: string; url: string; repo: string; number: number | null }[]
  >([]);
  const [searchProvider, setSearchProvider] = useState<"algolia" | "github" | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
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
    if (!pending) return;
    const t1 = window.setTimeout(() => setStepIndex(1), 700);
    const t2 = window.setTimeout(() => setStepIndex(2), 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pending]);

  function runMatch() {
    setStepIndex(0);
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
        track("match");
        if (json.picked) {
          recordJourney({
            kind: "match",
            title: `${json.picked.owner}/${json.picked.repo}#${json.picked.number}`,
            href: `/issue/${json.picked.owner}/${json.picked.repo}/${json.picked.number}`,
            detail: json.picked.title,
          });
        }
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
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
      >
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex w-full min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted-foreground">
            {t("match.username")}
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("match.usernamePlaceholder")}
              required
              autoComplete="username"
              disabled={pending}
              className="min-h-11 h-11 w-full rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
            />
          </label>
          <label className="flex w-full min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted-foreground">
            {t("match.repo")}
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder={t("match.repoPlaceholder")}
              disabled={pending}
              className="min-h-11 h-11 w-full rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
            />
          </label>
          <button
            type="submit"
            disabled={pending || !username.trim()}
            className={cn(arrowPillClass, "w-full shrink-0 sm:w-auto")}
          >
            {pending ? t("match.finding") : t("match.submit")}
            {pending ? (
              <span className="flex size-9 items-center justify-center rounded-full bg-white">
                <Spinner className="text-primary" />
              </span>
            ) : (
              <ArrowBubble />
            )}
          </button>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
          onClick={() => setUsername("octocat")}
        >
          {t("match.sample")}
        </button>
      </form>

      <form
        className="rounded-xl border border-border bg-card p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim().length < 2 || searching) return;
          setSearching(true);
          setSearchError(null);
          void fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: query.trim() }),
          })
            .then(async (res) => {
              const json = (await res.json()) as {
                hits?: typeof searchHits;
                provider?: "algolia" | "github";
                error?: string;
                code?: string;
              };
              if (!res.ok) {
                setSearchHits([]);
                setSearchError(friendlyErrorMessage(json.code, json.error || t("match.failed")));
                return;
              }
              setSearchProvider(json.provider ?? "github");
              setSearchHits(json.hits ?? []);
              track("search");
            })
            .catch(() => setSearchError(t("match.failed")))
            .finally(() => setSearching(false));
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {t("match.searchLabel")}
          <span className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("match.searchPlaceholder")}
              className="min-h-11 h-11 rounded-xl"
            />
            <button type="submit" className={cn(arrowPillClass, "w-full sm:w-auto")} disabled={searching}>
              {searching ? t("match.finding") : t("match.searchSubmit")}
              <ArrowBubble />
            </button>
          </span>
        </label>
        {searchProvider === "algolia" ? (
          <AlgoliaMark className="mt-3 inline-flex min-h-11 items-center gap-2" />
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">{t("match.searchGithub")}</p>
        )}
        {searchError ? <p className="mt-3 text-sm text-red-700">{searchError}</p> : null}
        {searchHits.length === 0 && searchProvider && !searchError && !searching ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("match.searchEmpty")}</p>
        ) : null}
        <ul className="mt-3 space-y-2">
          {searchHits.map((hit) => (
            <li key={hit.url}>
              <a
                href={hit.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                {hit.repo ? `${hit.repo} · ` : ""}
                {hit.title}
              </a>
            </li>
          ))}
        </ul>
      </form>

      {pending ? (
        <div className="flex flex-col gap-6">
          <ol className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
            {progressSteps.map((label, i) => (
              <li
                key={label}
                className={`flex min-w-0 items-center gap-2 py-1.5 ${
                  i <= stepIndex ? "text-foreground" : "text-muted-foreground/60"
                }`}
              >
                <span
                  className={`size-1.5 shrink-0 rounded-full ${
                    i <= stepIndex ? "bg-primary" : "bg-border"
                  }`}
                />
                <span className="min-w-0 break-words">{label}</span>
                {i === stepIndex ? "…" : null}
              </li>
            ))}
          </ol>
          <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-6 w-2/3 rounded-lg bg-muted" />
            <Skeleton className="h-4 w-full rounded-lg bg-muted" />
            <Skeleton className="h-4 w-5/6 rounded-lg bg-muted" />
            <Skeleton className="mt-2 h-11 w-40 rounded-xl bg-muted" />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          <p className="break-words">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 min-h-11 rounded-xl border-border"
            onClick={runMatch}
          >
            {t("match.retry")}
          </Button>
        </div>
      ) : null}

      {data && !pending ? (
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("match.youWrite")}</span>
            {data.languages.length === 0 ? (
              <span className="text-muted-foreground">
                {t("match.noPublicRepos")}
              </span>
            ) : (
              data.languages.map((lang) => (
                <Badge
                  key={lang}
                  variant="secondary"
                  className="rounded-md border border-border text-xs"
                >
                  {lang}
                </Badge>
              ))
            )}
          </div>

          {data.picked ? (
            <article className="relative min-w-0 overflow-hidden rounded-xl border border-primary/30 bg-card p-5 shadow-md shadow-primary/5 ring-1 ring-primary/10 sm:p-6">
              <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
              <SavedResultDot show={fromCache} />
              <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                {data.picked.difficultyBadge ? (
                  <DifficultyBadge label={data.picked.difficultyBadge} />
                ) : null}
                <a
                  href={data.picked.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-words text-lg font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xl"
                >
                  #{data.picked.number} {data.picked.title}
                </a>
                {data.picked.labels.map((label) => (
                  <Badge
                    key={label}
                    variant="secondary"
                    className="rounded-md border border-border text-xs"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
              <p className="break-words text-muted-foreground">
                {data.picked.fitReason}
              </p>
              {data.picked.availability?.status === "free" ? (
                <p className="mt-2 text-sm text-emerald-700">{data.picked.availability.summary}</p>
              ) : data.picked.availability ? (
                <p className="mt-2 text-sm text-amber-800">{data.picked.availability.summary}</p>
              ) : null}
              {data.picked.difficultyReason ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.picked.difficultyReason}
                </p>
              ) : null}
              <Link
                href={`/issue/${data.picked.owner}/${data.picked.repo}/${data.picked.number}`}
                className={cn(arrowPillClass, "mt-5 w-full sm:w-auto")}
              >
                {t("match.explainIssue")}
                <ArrowBubble />
              </Link>
            </article>
          ) : noIssues ? (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm break-words">
              {t("match.noIssues")}
            </p>
          ) : null}

          {data.others.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {t("match.otherFits")}
              </h2>
              {data.others.map((issue) => (
                <article
                  key={`${issue.owner}/${issue.repo}#${issue.number}`}
                  className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/30 sm:p-5"
                >
                  <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2">
                    {issue.difficultyBadge ? (
                      <DifficultyBadge label={issue.difficultyBadge} />
                    ) : null}
                    <a
                      href={issue.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 break-words font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      #{issue.number} {issue.title}
                    </a>
                    {issue.labels.map((label) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className="rounded-md text-xs"
                      >
                        {label}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground break-words">
                    {issue.fitReason}
                  </p>
                  <Link
                    href={`/issue/${issue.owner}/${issue.repo}/${issue.number}`}
                    className="mt-2 inline-flex min-h-11 items-center text-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    {t("match.explainIssue")}
                  </Link>
                </article>
              ))}
            </div>
          ) : null}

          {data.skipped.length > 0 ? (
            <div className="flex min-w-0 flex-col gap-3">
              <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {t("match.alreadyTaken")}
              </h2>
              {data.skipped.map((issue) => (
                <article
                  key={`skip-${issue.owner}/${issue.repo}#${issue.number}`}
                  className="min-w-0 rounded-xl border border-border bg-muted p-4 opacity-80"
                >
                  <p className="font-medium text-muted-foreground break-words">
                    #{issue.number} {issue.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground/80 break-words">
                    {issue.reason}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
