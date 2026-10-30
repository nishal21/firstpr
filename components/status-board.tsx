"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SentryGlyph } from "@/components/sentry-mark";
import {
  CHECK_TIMEOUT_MS,
  SLOW_MS,
  type CheckState,
  type PublicCheck,
  type PublicReport,
} from "@/lib/status-report";

const STATE_LABEL: Record<CheckState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "No data yet",
};

const HEADLINE: Record<PublicReport["overall"], string> = {
  operational: "All systems operational",
  degraded: "Some systems degraded",
  down: "FirstPR is down",
};

const EVENT_LABEL: Partial<Record<PublicCheck["id"], string>> = {
  bot: "Last delivery",
  sync: "Started",
};

const SAMPLE_KEY = "firstpr-status-samples";
const MAX_SAMPLES = 24;

type Samples = { seen: string[]; byId: Record<string, (number | null)[]> };

function relative(iso: string, now: number): string {
  const secs = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function localTime(iso: string, withDate = false): string {
  return new Intl.DateTimeFormat(undefined, {
    ...(withDate ? { day: "numeric", month: "short" } : {}),
    hour: "numeric",
    minute: "2-digit",
    second: withDate ? undefined : "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

function addSamples(prev: Samples, report: PublicReport): Samples {
  if (prev.seen.includes(report.generatedAt)) return prev;
  const byId = { ...prev.byId };
  for (const c of report.checks) {
    byId[c.id] = [...(byId[c.id] ?? []), c.latencyMs].slice(-MAX_SAMPLES);
  }
  return { seen: [...prev.seen, report.generatedAt].slice(-MAX_SAMPLES), byId };
}

function subscribeNothing(): () => void {
  return () => {};
}

function mergeSamples(saved: Samples, cur: Samples): Samples {
  let out = saved;
  cur.seen.forEach((at, i) => {
    if (out.seen.includes(at)) return;
    const byId = { ...out.byId };
    for (const [id, list] of Object.entries(cur.byId)) {
      byId[id] = [...(byId[id] ?? []), list[i] ?? null].slice(-MAX_SAMPLES);
    }
    out = { seen: [...out.seen, at].slice(-MAX_SAMPLES), byId };
  });
  return out;
}

function Pill({ state }: { state: CheckState }) {
  return (
    <span className="status-pill" data-state={state}>
      <span aria-hidden className="status-square" />
      {STATE_LABEL[state]}
    </span>
  );
}

function Rel({ iso, now, mounted }: { iso: string; now: number; mounted: boolean }) {
  return (
    <time dateTime={iso} title={mounted ? localTime(iso, true) : undefined} suppressHydrationWarning>
      {relative(iso, now)}
    </time>
  );
}

function LatencyMeter({ ms, samples }: { ms: number | null; samples: (number | null)[] }) {
  const pct = ms === null ? 100 : Math.min(100, (ms / CHECK_TIMEOUT_MS) * 100);
  const slowAt = (SLOW_MS / CHECK_TIMEOUT_MS) * 100;
  const points = samples.filter((s): s is number => s !== null);
  let path = "";
  if (points.length >= 2) {
    const max = Math.max(...points, 400);
    path = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 60).toFixed(1)},${(16 - (p / max) * 14).toFixed(1)}`)
      .join(" ");
  }
  return (
    <div className="flex items-center gap-3">
      <div
        className="latency-track"
        role="meter"
        aria-label="Response time"
        aria-valuemin={0}
        aria-valuemax={CHECK_TIMEOUT_MS}
        aria-valuenow={ms ?? CHECK_TIMEOUT_MS}
        aria-valuetext={ms === null ? "No answer" : `${ms} milliseconds`}
      >
        <span className="latency-fill" data-none={ms === null ? "true" : undefined} style={{ width: `${pct}%` }} />
        <span aria-hidden className="latency-tick" style={{ left: `${slowAt}%` }} />
      </div>
      <span className="font-plex shrink-0 text-xs tabular-nums">{ms === null ? "no answer" : `${ms} ms`}</span>
      {path ? (
        <svg viewBox="0 0 60 18" className="h-[18px] w-[60px] shrink-0" aria-hidden>
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

function CheckCard({
  check,
  now,
  mounted,
  samples,
}: {
  check: PublicCheck;
  now: number;
  mounted: boolean;
  samples: (number | null)[];
}) {
  return (
    <li className="ink-card status-card flex flex-col gap-3 p-4" data-state={check.state}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base leading-tight font-semibold">{check.name}</h2>
        <Pill state={check.state} />
      </div>
      <p className="text-sm leading-snug text-pretty">{check.detail}</p>
      <div className="mt-auto space-y-2 pt-1">
        <LatencyMeter ms={check.latencyMs} samples={samples} />
        <p className="font-plex flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] opacity-80">
          <span>
            Checked <Rel iso={check.checkedAt} now={now} mounted={mounted} />
          </span>
          {check.lastEventAt ? (
            <span>
              {EVENT_LABEL[check.id] ?? "Last event"} <Rel iso={check.lastEventAt} now={now} mounted={mounted} />
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0">
      <p className="font-spray text-4xl leading-none sm:text-5xl">{value}</p>
      <p className="font-plex mt-2 text-[11px] tracking-[0.14em] uppercase">{label}</p>
    </div>
  );
}

function BotBlock({ report }: { report: PublicReport }) {
  const stats = report.botLast30Days;
  const d = report.webhookDeliveries;
  const notAccepted = d ? d.total - d.accepted : 0;
  const breakdown = d
    ? [
        d.clientErrors ? `${d.clientErrors} refused (4xx)` : "",
        d.serverErrors ? `${d.serverErrors} failed (5xx)` : "",
        d.noResponse ? `${d.noResponse} timed out` : "",
      ].filter(Boolean)
    : [];
  const pct = stats && stats.runs > 0 ? Math.round((Math.min(stats.ok, stats.runs) / stats.runs) * 100) : 0;

  return (
    <section aria-labelledby="bot-heading" className="bot-block mt-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="bot-heading" className="text-lg font-semibold">
          FirstPRbot, last 30 days
        </h2>
        <p className="font-plex text-[11px] tracking-[0.14em] uppercase">All repos combined</p>
      </div>
      {stats === null ? (
        <p className="mt-3 text-sm">The 30-day numbers could not be read just now. They will show on the next refresh.</p>
      ) : stats.runs > 0 ? (
        <div className="mt-5 grid grid-cols-3 gap-4">
          <Stat value={String(stats.prs)} label={stats.prs === 1 ? "PR handled" : "PRs handled"} />
          <Stat value={`${pct}%`} label="Runs without error" />
          <Stat value={String(stats.runs)} label={stats.runs === 1 ? "Run" : "Runs"} />
        </div>
      ) : (
        <p className="mt-3 max-w-prose text-sm leading-relaxed">
          No bot runs recorded yet. Counting started on 30 October 2026, and the numbers show up here after the
          first pull request the bot checks.
        </p>
      )}
      {d && d.total > 0 ? (
        <div className="bot-deliveries mt-5 pt-4">
          <p className="text-sm">
            Webhook: {d.accepted} of the last {d.total} deliveries accepted
            {notAccepted > 0 && breakdown.length ? `. Not accepted: ${breakdown.join(", ")}.` : "."}
          </p>
          <div className="delivery-strip mt-2" aria-hidden>
            {Array.from({ length: d.total }, (_, i) => (
              <span key={i} data-ok={i < d.accepted ? "true" : "false"} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function StatusBoard({ initial }: { initial: PublicReport }) {
  const [report, setReport] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.generatedAt));
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const [stale, setStale] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [samples, setSamples] = useState<Samples>(() => addSamples({ seen: [], byId: {} }, initial));
  const prevStates = useRef(new Map(initial.checks.map((c) => [c.id, c.state])));

  // Restore this visit's latency samples so the sparkline survives a reload.
  useEffect(() => {
    const id = setTimeout(() => {
      setNow(Date.now());
      try {
        const saved = JSON.parse(sessionStorage.getItem(SAMPLE_KEY) ?? "null") as Samples | null;
        if (saved?.seen && saved.byId) setSamples((cur) => mergeSamples(saved, cur));
      } catch {
        // Ignore broken storage.
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SAMPLE_KEY, JSON.stringify(samples));
    } catch {
      // Storage can be full or blocked.
    }
  }, [samples]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error("status");
        const next = (await res.json()) as PublicReport;
        if (cancelled || !Array.isArray(next.checks)) return;
        const changed = next.checks.filter((c) => prevStates.current.get(c.id) !== c.state);
        if (changed.length) {
          setAnnounce(changed.map((c) => `${c.name} is now ${STATE_LABEL[c.state]}.`).join(" "));
        }
        prevStates.current = new Map(next.checks.map((c) => [c.id, c.state]));
        setReport(next);
        setSamples((cur) => addSamples(cur, next));
        setStale(false);
      } catch {
        if (!cancelled) setStale(true);
      }
      if (!cancelled) setNow(Date.now());
    };
    const every = Math.max(30, initial.refreshSeconds || 60) * 1000;
    const timer = setInterval(refresh, every);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [initial.refreshSeconds]);

  const counts = useMemo(() => {
    const c = { operational: 0, degraded: 0, down: 0, unknown: 0 } as Record<CheckState, number>;
    for (const check of report.checks) c[check.state]++;
    return c;
  }, [report.checks]);

  return (
    <article className="mx-auto w-full max-w-5xl px-4 pt-6 pb-12 sm:px-6 md:pt-10 md:pb-16">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="font-plex flex items-center gap-2 text-xs" aria-live="off">
          <span aria-hidden className="live-dot" data-stale={stale ? "true" : undefined} />
          <span>
            {stale ? "Could not refresh. Showing the last result, " : "Live, updated "}
            <time dateTime={report.generatedAt} suppressHydrationWarning>
              {mounted ? localTime(report.generatedAt) : relative(report.generatedAt, now)}
            </time>
            {mounted ? <span className="opacity-70"> ({relative(report.generatedAt, now)})</span> : null}
          </span>
        </p>
        <a className="sticker-pill font-plex text-xs" href="/api/status">
          View raw JSON
        </a>
      </div>

      <section className="status-hero mt-4 p-5 sm:p-7" data-state={report.overall} aria-labelledby="status-headline">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="cat-tag status-cat" aria-hidden>
            <Image src="/brand/logo-mark-512.png" alt="" width={120} height={120} priority className="cat-tag-mark" />
          </div>
          <div className="min-w-0">
            <p className="font-plex text-[11px] tracking-[0.16em] uppercase">FirstPR status</p>
            <h1
              id="status-headline"
              className="font-spray mt-2 text-[2rem] leading-[0.95] text-balance sm:text-5xl md:text-6xl"
              aria-live="polite"
            >
              {HEADLINE[report.overall]}
            </h1>
            <p className="mt-3 max-w-prose text-base leading-snug font-medium">{report.reason}</p>
          </div>
        </div>
        <ul className="status-strip mt-5" aria-label="Checks at a glance">
          {report.checks.map((c) => (
            <li key={c.id} data-state={c.state}>
              <span aria-hidden className="status-square" />
              <span className="font-plex text-[11px]">{c.name}</span>
              <span className="sr-only">: {STATE_LABEL[c.state]}</span>
            </li>
          ))}
        </ul>
        <p className="font-plex mt-3 text-[11px]">
          {counts.operational} operational
          {counts.degraded ? `, ${counts.degraded} degraded` : ""}
          {counts.down ? `, ${counts.down} down` : ""}
          {counts.unknown ? `, ${counts.unknown} waiting for data` : ""}
        </p>
      </section>

      <p className="sr-only" aria-live="polite" role="status">
        {announce}
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {report.checks.map((check) => (
          <CheckCard
            key={check.id}
            check={check}
            now={now}
            mounted={mounted}
            samples={samples.byId[check.id] ?? []}
          />
        ))}
      </ul>

      <BotBlock report={report} />

      <footer className="mt-8 grid gap-4 text-sm leading-relaxed text-muted-foreground md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p>
            Checks run on the server at most once a minute, whatever the traffic, and this page refreshes itself
            every minute. A check that does not answer in {CHECK_TIMEOUT_MS / 1000} seconds gets one more try before
            it shows as Down. The bar under each check fills toward that limit; the mark is where it counts as slow.
          </p>
          <p>
            FirstPR has no database. Issue search lives in Algolia, and everything else is read from GitHub when you
            ask for it.
          </p>
        </div>
        <a
          className="inline-flex items-center gap-1.5 text-xs underline-offset-2 hover:underline"
          href="https://sentry.io/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <SentryGlyph className="h-3.5 w-auto" />
          Monitored by Sentry
        </a>
      </footer>
    </article>
  );
}
