"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/language-provider";

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

  useEffect(() => {
    const controller = new AbortController();
    const lang = language ? `&lang=${encodeURIComponent(language)}` : "";
    fetch(`/api/search?q=${encodeURIComponent(query)}${lang}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("search");
        return (await res.json()) as { issues?: Hit[] };
      })
      .then((json) => {
        setHits(Array.isArray(json.issues) ? json.issues : []);
        setFailed(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFailed(true);
        setHits([]);
      });
    return () => controller.abort();
  }, [language, query]);

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">
        {t("match.topicHeading", { query })}
      </h3>
      {language ? (
        <p className="mt-1 text-sm text-muted-foreground">{language}</p>
      ) : null}
      {hits === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("search.searching")}</p>
      ) : null}
      {failed ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("match.topicEmpty")}</p>
      ) : null}
      {hits && hits.length === 0 && !failed ? (
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
