import * as Sentry from "@sentry/nextjs";
import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import { readBotReliability } from "@/lib/bot-runs";
import { getEnv } from "@/lib/env";
import { getGitHubApp } from "@/lib/github-app";
import { SITE_URL } from "@/lib/site-url";
import {
  ago,
  CHECK_TIMEOUT_MS,
  quotaBand,
  REPORT_TTL_MS,
  runCheck,
  toPublicReport,
  type BotReliability,
  type CheckId,
  type CheckResult,
  type CheckState,
  type Outcome,
  type Probe,
  type PublicReport,
} from "@/lib/status-report";
import { readSyncSnapshot } from "@/lib/sync-status";

export type { CheckState, PublicCheck, PublicReport } from "@/lib/status-report";

/** The daily sync is late after this long. */
const SYNC_LATE_MS = 36 * 60 * 60 * 1000;
const USER_AGENT = "FirstPR-status";

async function checkWebsite(signal: AbortSignal): Promise<Outcome> {
  const res = await fetch(`${SITE_URL}/`, { method: "HEAD", signal, headers: { "user-agent": USER_AGENT } });
  if (res.ok) return { state: "operational", detail: "The home page loads." };
  return {
    state: res.status >= 500 ? "down" : "degraded",
    detail: `The home page answered with HTTP ${res.status}.`,
  };
}

async function checkApi(signal: AbortSignal): Promise<Outcome> {
  const res = await fetch(`${SITE_URL}/api/health`, { signal, headers: { "user-agent": USER_AGENT } });
  const body = res.ok ? ((await res.json()) as { ok?: unknown }) : null;
  if (body?.ok === true) return { state: "operational", detail: "The API answers." };
  return { state: "down", detail: `The API health check answered with HTTP ${res.status}.` };
}

async function checkGitHub(signal: AbortSignal): Promise<Outcome> {
  const token = getEnv().GITHUB_TOKEN;
  const res = await fetch("https://api.github.com/rate_limit", {
    signal,
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": USER_AGENT,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    return { state: res.status >= 500 ? "down" : "degraded", detail: `GitHub answered with HTTP ${res.status}.` };
  }
  const data = (await res.json()) as { resources?: { core?: { limit?: number; remaining?: number } } };
  const core = data.resources?.core;
  if (!core?.limit || typeof core.remaining !== "number") {
    return { state: "operational", detail: "GitHub answers." };
  }
  const band = quotaBand(core.remaining, core.limit);
  return { state: band.low ? "degraded" : "operational", detail: `GitHub answers. ${band.text}` };
}

async function checkSearch(): Promise<Outcome> {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
    return { state: "down", detail: "Search is not set up on this deployment." };
  }
  const client = algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_ADMIN_KEY, {
    timeouts: { connect: 1500, read: CHECK_TIMEOUT_MS, write: CHECK_TIMEOUT_MS },
  });
  const res = await client.searchSingleIndex({
    indexName: env.ALGOLIA_INDEX_NAME || ALGOLIA_INDEX_DEFAULT,
    searchParams: { query: "", hitsPerPage: 0, analytics: false, clickAnalytics: false },
  });
  const count = res.nbHits ?? 0;
  if (count === 0) return { state: "degraded", detail: "Search answers, but the index is empty." };
  return { state: "operational", detail: `Search answers. ${count.toLocaleString("en-US")} open issues are in the index.` };
}

type HookDelivery = { delivered_at?: string; status_code?: number; event?: string };

async function checkBot(signal: AbortSignal): Promise<Outcome> {
  let app: ReturnType<typeof getGitHubApp>;
  try {
    app = getGitHubApp();
  } catch {
    return { state: "down", detail: "FirstPRbot is not set up on this deployment." };
  }
  const { data } = await app.octokit.request("GET /app/hook/deliveries", {
    per_page: 25,
    request: { signal },
  });
  // Only status codes and times are read. Ids, repos, payloads and guids are ignored.
  const deliveries = (data as HookDelivery[]).filter((d) => d.event !== "ping");
  if (deliveries.length === 0) {
    return { state: "operational", detail: "The webhook is set up. GitHub has no recent deliveries to show." };
  }
  const code = (d: HookDelivery) => (typeof d.status_code === "number" ? d.status_code : 0);
  const ok = (d: HookDelivery) => code(d) >= 200 && code(d) < 300;
  const counts = {
    accepted: deliveries.filter(ok).length,
    total: deliveries.length,
    clientErrors: deliveries.filter((d) => code(d) >= 400 && code(d) < 500).length,
    serverErrors: deliveries.filter((d) => code(d) >= 500).length,
    noResponse: deliveries.filter((d) => code(d) === 0).length,
  };
  const latest = deliveries[0];
  const when = latest.delivered_at ? ` Latest ${ago(latest.delivered_at)}.` : "";
  const state: CheckState = ok(latest) ? "operational" : counts.accepted > 0 ? "degraded" : "down";
  return {
    state,
    detail: `${counts.accepted} of the last ${counts.total} webhook deliveries were accepted.${when}`,
    lastEventAt: latest.delivered_at ?? null,
    deliveries: counts,
  };
}

const RESULT_TEXT = {
  complete: "finished a full pass",
  partial: "stopped at its time limit and the next run continues",
  rate_limited: "stopped at GitHub's rate limit",
  error: "failed",
} as const;

async function checkSync(): Promise<Outcome> {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
    return { state: "down", detail: "Search sync is not set up on this deployment." };
  }
  const snap = await readSyncSnapshot();
  const run = snap.lastRun;
  if (!run) {
    const pass = snap.passStartedAt
      ? ` The current pass started ${ago(snap.passStartedAt)}${snap.passIndexed !== null ? ` and has saved ${snap.passIndexed.toLocaleString("en-US")} issues` : ""}.`
      : "";
    return { state: "unknown", detail: `No finished run is recorded yet.${pass}`, lastEventAt: snap.passStartedAt };
  }
  const late = Date.now() - Date.parse(run.at) > SYNC_LATE_MS;
  const counts =
    run.result === "error"
      ? ""
      : ` ${run.indexed.toLocaleString("en-US")} saved, ${run.removed.toLocaleString("en-US")} removed.`;
  let state: CheckState = run.result === "error" || run.result === "rate_limited" ? "degraded" : "operational";
  if (late) state = "degraded";
  return {
    state,
    detail: `The last run ${ago(run.at)} ${RESULT_TEXT[run.result]}.${counts}${late ? " The daily run is late." : ""}`,
    lastEventAt: run.at,
  };
}

const PROBES: [CheckId, Probe][] = [
  ["website", checkWebsite],
  ["api", checkApi],
  ["github", checkGitHub],
  ["search", () => checkSearch()],
  ["bot", checkBot],
  ["sync", () => checkSync()],
];

/** Errors go to Sentry only. The public report never sees them. */
function reportError(id: CheckId, err: unknown): void {
  Sentry.captureException(err, { tags: { status_check: id }, fingerprint: ["status-check-error", id] });
}

/** Last state per check in this server instance, so Sentry hears about changes only. */
const lastStates = new Map<CheckId, CheckState>();

function reportChanges(checks: CheckResult[]): void {
  for (const check of checks) {
    const before = lastStates.get(check.id);
    lastStates.set(check.id, check.state);
    if (check.state === "down" && before !== "down") {
      Sentry.captureMessage(`Status check down: ${check.id}`, {
        level: "warning",
        tags: { status_check: check.id },
        fingerprint: ["status-check-down", check.id],
      });
    }
  }
}

async function botLast30Days(): Promise<BotReliability | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      readBotReliability(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), CHECK_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    reportError("bot", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildReport(): Promise<PublicReport> {
  const bot = botLast30Days();
  const results = await Promise.all(PROBES.map(([id, probe]) => runCheck(id, probe, { onError: reportError })));
  try {
    reportChanges(results);
  } catch {
    // Reporting must never break the page.
  }
  return toPublicReport(results, await bot, Date.now());
}

// One report per server instance per minute, shared by the page and /api/status,
// on top of the 60 s CDN cache. Upstream checks never run more than once a
// minute per instance no matter how many people load the page.
let cached: { at: number; report: Promise<PublicReport> } | null = null;

export function getStatusReport(): Promise<PublicReport> {
  const now = Date.now();
  if (cached && now - cached.at < REPORT_TTL_MS) return cached.report;
  const report = buildReport().catch((err) => {
    cached = null;
    throw err;
  });
  cached = { at: now, report };
  return report;
}
