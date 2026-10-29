"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { parseGitHubInput, repoSlug, shortLabel } from "@/lib/parse-github-input";

type Hit = {
  owner: string;
  repo: string;
  number: number;
  title: string;
};

export function TopicIssues({ query, language }: { query: string; language?: string }) {
  const t = useT();
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const input = parseGitHubInput(query);
  const repo = repoSlug(input);
  const notGitHub = input.kind === "url";
  // A repo link searches that repo only; other links never become a word search.
  const searchFor = notGitHub ? null : (repo ?? query);

  useEffect(() => {
    if (searchFor === null) return;
    const controller = new AbortController();
    const lang = language && !repo ? `&lang=${encodeURIComponent(language)}` : "";
    fetch(`/api/search?q=${encodeURIComponent(searchFor)}${lang}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("search");
        return (await res.json()) as { issues?: Hit[]; error?: string };
      })
      .then((json) => {
        const list = Array.isArray(json.issues) ? json.issues : [];
        setHits(list);
        setFailed(list.length === 0 && Boolean(json.error));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
        setHits([]);
      });
    return () => controller.abort();
  }, [language, repo, searchFor]);

  if (notGitHub) {
    return (
      <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{t("match.notGithub")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("match.notGithubHint")}</p>
      </div>
    );
  }

  const empty = hits !== null && hits.length === 0;
  const issuesUrl = repo ? `https://github.com/${repo}/issues` : null;

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold break-words text-foreground">
        {repo
          ? t("match.repoHeading", { repo })
          : t("match.topicHeading", { query: shortLabel(query) })}
      </h3>
      {language && !repo ? (
        <p className="mt-1 text-sm text-muted-foreground">{language}</p>
      ) : null}
      {repo ? (
        <p className="mt-1 text-sm text-muted-foreground">{t("match.repoMatchHint")}</p>
      ) : null}
      {hits === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("search.searching")}</p>
      ) : null}
      {empty && repo && issuesUrl ? (
        <p className="mt-3 text-sm break-words text-muted-foreground">
          {failed ? t("match.repoFailed", { repo }) : t("match.repoEmpty", { repo })}{" "}
          <a
            href={issuesUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary hover:underline"
          >
            {t("match.repoEmptyLink")}
          </a>
        </p>
      ) : null}
      {empty && !repo ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("match.topicEmpty")}</p>
      ) : null}
      {hits && hits.length > 0 ? (
        <ul className="mt-3 flex flex-col">
          {hits.map((hit) => (
            <li key={`${hit.owner}/${hit.repo}#${hit.number}`} className="border-t border-border first:border-t-0">
              <Link
                href={`/issue/${encodeURIComponent(hit.owner)}/${encodeURIComponent(hit.repo)}/${hit.number}`}
                className="flex min-h-11 flex-col justify-center py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="text-sm font-medium break-words text-foreground">
                  {hit.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {hit.owner}/{hit.repo}#{hit.number}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
