"use client";

import Link from "next/link";
import { useT } from "@/components/language-provider";
import { PageIntro } from "@/components/page-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";

export type RepoIssueCard = {
  number: number;
  title: string;
  assignees: string[];
};

export function RepoReadiness({
  owner,
  repo,
  description,
  language,
  stars,
  contributing,
  issues,
  error,
}: {
  owner: string;
  repo: string;
  description: string | null;
  language: string | null;
  stars: number | null;
  contributing: boolean | null;
  issues: RepoIssueCard[];
  error: "missing" | "issues" | null;
}) {
  const t = useT();
  const name = `${owner}/${repo}`;
  const matchHref = `/?repo=${encodeURIComponent(name)}#match`;

  return (
    <>
      <PageIntro
        eyebrow={<span className="text-primary">{t("repo.eyebrow")}</span>}
        title={name}
        subtitle={
          error === "missing"
            ? t("repo.missing")
            : description || t("search.readiness", { owner, repo })
        }
      />
      {error === "missing" ? null : (
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:py-12">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{t("repo.language")}</dt>
              <dd className="mt-1 text-sm font-medium break-words">{language || "—"}</dd>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{t("repo.stars")}</dt>
              <dd className="mt-1 text-sm font-medium">
                {stars == null ? "—" : t("repo.starsValue", { count: stars })}
              </dd>
            </div>
            <div className="col-span-2 rounded-xl border border-border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{t("repo.beginnerIssues")}</dt>
              <dd className="mt-1 text-sm font-medium">
                {t("repo.beginnerCount", { count: issues.length })}
              </dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {contributing ? t("repo.contributingYes") : t("repo.contributingNo")}
          </p>
          {error === "issues" ? (
            <p className="text-sm text-muted-foreground">{t("repo.issuesFailed")}</p>
          ) : null}
          {issues.length === 0 && error !== "issues" ? (
            <p className="text-sm text-muted-foreground">{t("repo.emptyIssues")}</p>
          ) : (
            <ul className="flex flex-col rounded-xl border border-border bg-card">
              {issues.map((issue) => (
                <li key={issue.number} className="border-t border-border first:border-t-0">
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words text-foreground">
                        #{issue.number} {issue.title}
                      </p>
                      {issue.assignees.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{t("match.alreadyTaken")}</p>
                      ) : null}
                    </div>
                    <Link
                      href={`/issue/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${issue.number}`}
                      className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {t("repo.explain")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href={matchHref} className={cn(arrowPillClass, "w-full sm:w-fit")}>
            {t("repo.matchCta")}
            <ArrowBubble />
          </Link>
        </div>
      )}
    </>
  );
}
