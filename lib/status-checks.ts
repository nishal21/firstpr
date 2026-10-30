import * as Sentry from "@sentry/nextjs";
import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import { getEnv } from "@/lib/env";
import { getGitHubApp } from "@/lib/github-app";
import { SITE_URL } from "@/lib/site-url";
import { readSyncSnapshot } from "@/lib/sync-status";

export type CheckState = "operational" | "degraded" | "down" | "unknown";

export type StatusCheck = {
  id: "website" | "api" | "github" | "search" | "bot" | "sync";
  name: string;
  state: CheckState;
  /** Round trip for this check, or null when it never answered. */
  latencyMs: number | null;
  checkedAt: string;
  /** Plain public sentence. Never an error message, host name, or stack. */
  detail: string;
  /** When the thing the check describes last happened, if it has a time (ISO). */
  lastEventAt?: string;
};

export type StatusReport = {
  overall: "operational" | "degraded" | "down";
  generatedAt: string;
  database: "none";
  checks: StatusCheck[];
};

/** Every check gives up after this, so the page never waits on a slow dependency. */
export const CHECK_TIMEOUT_MS = 2500;
/** Answers slower than this count as degraded. */
const SLOW_MS = 1500;
/** The sync cron runs daily; a run older than this is late. */
const SYNC_LATE_MS = 36 * 60 * 60 * 1000;
const USER_AGENT = "FirstPR-status";

type Outcome = { state: CheckState; detail: string; lastEventAt?: string };

class CheckTimeout extends Error {}

async function runCheck(
  id: StatusCheck["id"],
  name: string,
  fn: (signal: AbortSignal) => Promise<Outcome>,
): Promise<StatusCheck> {
  const controller = new AbortController();
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new CheckTimeout());
    }, CHECK_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([fn(controller.signal), timeout]);
    const latencyMs = Math.round(performance.now() - started);
    const slow = outcome.state === "operational" && latencyMs > SLOW_MS;
    return {
      id,
      name,
      latencyMs,
      checkedAt: new Date().toISOString(),
      ...outcome,
      state: slow ? "degraded" : outcome.state,
      detail: slow ? `${outcome.detail} Slow to answer.` : outcome.detail,
    };
  } catch (err) {
    return {
      id,
      name,
      state: "down",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      detail:
        err instanceof CheckTimeout
          ? `No answer within ${CHECK_TIMEOUT_MS / 1000} seconds.`
          : "The check could not reach it.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function ago(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

async function checkWebsite(signal: AbortSignal): Promise<Outcome> {
  const res = await fetch(`${SITE_URL}/`, { method: "HEAD", signal, headers: { "user-agent": USER_AGENT } });
  if (res.ok) return { state: "operational", detail: "The home page loads." };
  if (res.status >= 500) return { state: "down", detail: `The home page answered with HTTP ${res.status}.` };
  return { state: "degraded", detail: `The home page answered with HTTP ${res.status}.` };
}

async function checkApi(signal: AbortSignal): Promise<Outcome> {
  const res = await fetch(`${SITE_URL}/api/health`, { signal, headers: { "user-agent": USER_AGENT } });
  const body = res.ok ? ((await res.json()) as { ok?: unknown }) : null;
  const note = "FirstPR has no database. Search data lives in Algolia and the rest is read from GitHub on request.";
  if (body?.ok === true) return { state: "operational", detail: `The API answers. ${note}` };
  return { state: "down", detail: `The API health route answered with HTTP ${res.status}. ${note}` };
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
    return { state: "operational", detail: "GitHub answers. The rate limit was not reported." };
  }
  const pct = Math.round((core.remaining / core.limit) * 100);
  return {
    state: pct < 10 ? "degraded" : "operational",
    detail: `GitHub answers. ${pct}% of this hour’s API quota is left.`,
  };
}

async function checkSearch(): Promise<Outcome> {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
    return { state: "down", detail: "Search is not configured on this deployment." };
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
  return { state: "operational", detail: `Search answers. ${count.toLocaleString("en-US")} issues are in the index.` };
}

type HookDelivery = { delivered_at?: string; status_code?: number; event?: string };

async function checkBot(signal: AbortSignal): Promise<Outcome> {
  let app: ReturnType<typeof getGitHubApp>;
  try {
    app = getGitHubApp();
  } catch {
    return { state: "down", detail: "FirstPRbot is not configured on this deployment." };
  }
  const { data } = await app.octokit.request("GET /app/hook/deliveries", {
    per_page: 25,
    request: { signal },
  });
  const deliveries = (data as HookDelivery[]).filter((d) => d.event !== "ping");
  if (deliveries.length === 0) {
    return { state: "operational", detail: "Webhook is set up. GitHub has no recent deliveries to show." };
  }
  const ok = (d: HookDelivery) => typeof d.status_code === "number" && d.status_code >= 200 && d.status_code < 300;
  const accepted = deliveries.filter(ok).length;
  const latest = deliveries[0];
  const when = latest.delivered_at ? ` Latest ${ago(latest.delivered_at)}.` : "";
  const detail = `${accepted} of the last ${deliveries.length} webhook deliveries were accepted.${when}`;
  const state: CheckState = ok(latest) ? "operational" : accepted > 0 ? "degraded" : "down";
  return { state, detail, lastEventAt: latest.delivered_at };
}

const RESULT_TEXT = {
  complete: "finished a full pass",
  partial: "stopped at its time limit; the next run continues",
  rate_limited: "stopped at GitHub’s rate limit",
  error: "failed",
} as const;

async function checkSync(): Promise<Outcome> {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
    return { state: "down", detail: "Search sync is not configured on this deployment." };
  }
  const snap = await readSyncSnapshot();
  const run = snap.lastRun;
  if (!run) {
    const pass = snap.passStartedAt
      ? ` The current pass started ${ago(snap.passStartedAt)}${snap.passIndexed !== null ? ` and has saved ${snap.passIndexed.toLocaleString("en-US")} issues` : ""}.`
      : "";
    return { state: "unknown", detail: `No finished run is recorded yet.${pass}`, lastEventAt: snap.passStartedAt ?? undefined };
  }
  const late = Date.now() - Date.parse(run.at) > SYNC_LATE_MS;
  const counts =
    run.result === "error"
      ? ""
      : ` ${run.indexed.toLocaleString("en-US")} saved, ${run.removed.toLocaleString("en-US")} removed.`;
  let state: CheckState = run.result === "error" || run.result === "rate_limited" ? "degraded" : "operational";
  if (late) state = "degraded";
  const lateText = late ? " The daily run is late." : "";
  return {
    state,
    detail: `Last run ${ago(run.at)} ${RESULT_TEXT[run.result]}.${counts}${lateText}`,
    lastEventAt: run.at,
  };
}

/** Last state each check had in this server instance, so Sentry hears about changes only. */
const lastStates = new Map<StatusCheck["id"], CheckState>();

function reportChanges(checks: StatusCheck[]): void {
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

export async function getStatusReport(): Promise<StatusReport> {
  const checks = await Promise.all([
    runCheck("website", "Website", checkWebsite),
    runCheck("api", "API", checkApi),
    runCheck("github", "GitHub API", checkGitHub),
    runCheck("search", "Issue search (Algolia)", checkSearch),
    runCheck("bot", "FirstPRbot webhook", checkBot),
    runCheck("sync", "Search index sync", checkSync),
  ]);
  try {
    reportChanges(checks);
  } catch {
    // Reporting must never break the page.
  }
  const states = checks.map((c) => c.state);
  const core = checks.filter((c) => c.id === "website" || c.id === "api");
  const overall = core.some((c) => c.state === "down")
    ? "down"
    : states.some((s) => s === "down" || s === "degraded")
      ? "degraded"
      : "operational";
  return { overall, generatedAt: new Date().toISOString(), database: "none", checks };
}