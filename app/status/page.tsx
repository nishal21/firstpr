import type { Metadata } from "next";
import Link from "next/link";
import { SentryGlyph } from "@/components/sentry-mark";
import { pageMetadata } from "@/lib/seo";
import { getStatusReport, type CheckState, type StatusReport } from "@/lib/status-checks";

export const revalidate = 60;
export const maxDuration = 30;

export const metadata: Metadata = pageMetadata({
  title: "Status",
  description:
    "Live checks for FirstPR: the website, the API, GitHub, Algolia search, the FirstPRbot webhook, and the daily search sync.",
  path: "/status",
});

const STATE_LABEL: Record<CheckState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "No data yet",
};

const STATE_COLOR: Record<CheckState, string> = {
  operational: "#0473fd",
  degraded: "#f5a524",
  down: "var(--destructive)",
  unknown: "var(--muted-foreground)",
};

const OVERALL_TEXT: Record<StatusReport["overall"], string> = {
  operational: "Everything is working.",
  degraded: "Some parts are slow or failing.",
  down: "FirstPR is down right now.",
};

function utc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

function StateChip({ state }: { state: CheckState }) {
  return (
    <span className="check-chip shrink-0">
      <span aria-hidden className="inline-block size-2.5" style={{ background: STATE_COLOR[state] }} />
      {STATE_LABEL[state]}
    </span>
  );
}

function BotLine({ stats }: { stats: StatusReport["botLast30Days"] }) {
  if (!stats) return null;
  if (stats.runs === 0) {
    return <p className="mt-1 text-sm leading-relaxed">No bot runs recorded in the last 30 days yet. Counting started on 30 October 2026.</p>;
  }
  const pct = Math.round((Math.min(stats.ok, stats.runs) / stats.runs) * 100);
  return (
    <p className="mt-1 text-sm leading-relaxed">
      Last 30 days: {stats.prs} {stats.prs === 1 ? "PR" : "PRs"} handled, {pct}% of {stats.runs}{" "}
      {stats.runs === 1 ? "run" : "runs"} finished without an error.
    </p>
  );
}

export default async function StatusPage() {
  const report = await getStatusReport();

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-14">
      <p className="font-plex text-xs tracking-wide text-muted-foreground">Checked on the server about once a minute</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Status</h1>

      <section className="ink-card mt-8 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <p className="text-lg font-semibold">{OVERALL_TEXT[report.overall]}</p>
        <StateChip state={report.overall} />
      </section>

      <ul className="mt-6 space-y-4">
        {report.checks.map((check) => (
          <li key={check.id} className="ink-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{check.name}</h2>
              <StateChip state={check.state} />
            </div>
            <p className="mt-2 text-base leading-relaxed">{check.detail}</p>
            {check.id === "bot" ? <BotLine stats={report.botLast30Days} /> : null}
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-plex text-xs">
              <span>{check.latencyMs === null ? "No response" : `${check.latencyMs} ms`}</span>
              <span>
                Checked <time dateTime={check.checkedAt}>{utc(check.checkedAt)}</time>
              </span>
              {check.lastEventAt ? (
                <span>
                  {check.id === "sync" ? "Run" : "Last event"}{" "}
                  <time dateTime={check.lastEventAt}>{utc(check.lastEventAt)}</time>
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>

      <section className="mt-8 space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          Each check gives up after a few seconds, so a slow service shows as Down instead of holding up this page.
          FirstPR has no database, so there is nothing to check there. The same data is at{" "}
          <Link className="underline underline-offset-2" href="/api/status">
            /api/status
          </Link>{" "}
          as JSON.
        </p>
        <p>
          <a
            className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
            href="https://sentry.io/"
          >
            <SentryGlyph className="h-3.5 w-auto" />
            Errors and cron runs are monitored by Sentry
          </a>
        </p>
      </section>
    </article>
  );
}