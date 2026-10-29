"use client";

import { useState } from "react";
import { useT } from "@/components/language-provider";
import { PageIntro } from "@/components/page-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { Input } from "@/components/ui/input";
import { friendlyErrorMessage } from "@/lib/api-errors";
import type { ReadyReport } from "@/lib/ready";
import { cn } from "@/lib/utils";

export default function ReadyPage() {
  const t = useT();
  const [repo, setRepo] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ReadyReport | null>(null);

  return (
    <>
      <PageIntro title={t("ready.title")} subtitle={t("ready.subtitle")} />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <form
          className="rounded-xl border border-border bg-card p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (!repo.trim() || pending) return;
            setPending(true);
            setError(null);
            void fetch("/api/ready", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ repo: repo.trim() }),
            })
              .then(async (res) => {
                const json = (await res.json()) as ReadyReport & { error?: string; code?: string };
                if (!res.ok) {
                  setReport(null);
                  setError(friendlyErrorMessage(json.code, json.error || t("ready.failed")));
                  return;
                }
                setReport(json);
              })
              .catch(() => setError(t("ready.failed")))
              .finally(() => setPending(false));
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {t("ready.repo")}
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder={t("ready.repoPlaceholder")}
              className="min-h-11 h-11 rounded-xl"
              required
            />
          </label>
          <button type="submit" className={cn(arrowPillClass, "mt-4 w-full sm:w-auto")} disabled={pending}>
            {pending ? t("ready.running") : t("ready.submit")}
            <ArrowBubble />
          </button>
        </form>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{error}</p>
        ) : null}

        {report ? (
          <div className="mt-8 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <p className="text-sm text-muted-foreground">
              <a href={report.htmlUrl} className="font-medium text-primary hover:underline">
                {report.owner}/{report.repo}
              </a>
              {report.language ? ` · ${report.language}` : ""}
              {` · ${report.stars} stars`}
            </p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">
              {report.score}
              <span className="ml-2 text-base font-normal text-muted-foreground">{t("ready.outOf")}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("ready.openIssues", { n: report.openUnassignedGfi })}
              {report.setupMinutes != null ? ` · setup heuristic ${report.setupMinutes} min` : ""}
            </p>
            <ul className="mt-6 divide-y divide-border">
              {report.checks.map((check) => (
                <li key={check.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{check.label}</p>
                    <p className="text-sm text-muted-foreground">{check.detail}</p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {check.points}/{check.max}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
