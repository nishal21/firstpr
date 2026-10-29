"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/language-provider";
import { track } from "@/lib/analytics";
import type { Availability, AvailabilityStatus } from "@/lib/availability";
import { recordJourney } from "@/lib/journey";
import type { SetupEstimate } from "@/lib/setup-estimate";

function statusLabel(status: AvailabilityStatus, t: (key: "availability.free" | "availability.assigned" | "availability.linked_pr" | "availability.claimed" | "availability.closed" | "availability.unknown") => string): string {
  switch (status) {
    case "free":
      return t("availability.free");
    case "assigned":
      return t("availability.assigned");
    case "linked_pr":
      return t("availability.linked_pr");
    case "claimed":
      return t("availability.claimed");
    case "closed":
      return t("availability.closed");
    case "unknown":
      return t("availability.unknown");
    default: {
      const neverStatus: never = status;
      return neverStatus;
    }
  }
}

export function IssueContext({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
}) {
  const t = useT();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [setup, setSetup] = useState<(SetupEstimate & { owner?: string }) | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const href = `/issue/${owner}/${repo}/${number}`;
    recordJourney({
      kind: "explain",
      title: `${owner}/${repo}#${number}`,
      href,
    });
    track("explain");
    const avail = new AbortController();
    const setupCtl = new AbortController();
    void fetch(
      `/api/availability?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&number=${number}`,
      { signal: avail.signal },
    )
      .then(async (res) => {
        if (!res.ok) return;
        setAvailability((await res.json()) as Availability);
      })
      .catch(() => undefined);
    void fetch(`/api/setup?repo=${encodeURIComponent(`${owner}/${repo}`)}`, {
      signal: setupCtl.signal,
    })
      .then(async (res) => {
        if (!res.ok) return;
        setSetup((await res.json()) as SetupEstimate);
      })
      .catch(() => undefined);
    return () => {
      avail.abort();
      setupCtl.abort();
    };
  }, [owner, repo, number]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm" aria-live="polite">
        <h2 className="text-sm font-semibold">{t("availability.title")}</h2>
        {availability ? (
          <>
            <p className="mt-2 text-sm font-medium text-foreground">
              {statusLabel(availability.status, t)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{availability.summary}</p>
            {availability.openPulls.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {availability.openPulls.map((pull) => (
                  <li key={pull.htmlUrl}>
                    <a href={pull.htmlUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                      #{pull.number} {pull.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Checking GitHub…</p>
        )}
        <button
          type="button"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href).then(() => {
              setCopied(true);
            });
          }}
        >
          {copied ? t("explain.shared") : t("explain.share")}
        </button>
      </section>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">{t("setup.title")}</h2>
        {setup ? (
          <>
            <p className="mt-2 text-sm font-medium">
              {t("setup.minutes", { low: setup.low, high: setup.high })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{setup.note}</p>
            {setup.steps.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t("setup.empty")}</p>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {setup.steps.map((step) => (
                  <li key={`${step.title}-${step.detail}`}>
                    <span className="font-medium text-foreground">{step.title}. </span>
                    {step.detail}
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Reading the repo…</p>
        )}
      </section>
    </div>
  );
}
