// Builds the public status report. Pure module: no env, no network, no Sentry,
// so scripts/verify-status-safety.ts can run it with fake failing checks.
//
// Everything that leaves this file goes through toPublicReport(), which copies
// only allowlisted fields. Check ids and names come from CHECKS below, never
// from a probe. Detail sentences must pass isSafeDetail() or get replaced by a
// fixed sentence. Error objects are handed to onError (Sentry) and never read.

export type CheckState = "operational" | "degraded" | "down" | "unknown";
export type CheckId = "website" | "api" | "github" | "search" | "bot" | "sync";

export const CHECKS: { id: CheckId; name: string; short: string }[] = [
  { id: "website", name: "Website", short: "Website" },
  { id: "api", name: "API", short: "API" },
  { id: "github", name: "GitHub API", short: "GitHub" },
  { id: "search", name: "Issue search", short: "Search" },
  { id: "bot", name: "FirstPRbot webhook", short: "Bot" },
  { id: "sync", name: "Search index sync", short: "Sync" },
];

/** One try gives up after this. A slow or timed-out first try gets one warm retry. */
export const CHECK_TIMEOUT_MS = 3000;
/** A check is degraded only when the warm retry is still slower than this. */
export const SLOW_MS = 2500;
/** A first try slower than this is treated as a cold start and tried again. */
export const RETRY_IF_OVER_MS = 1200;
/** How long one built report is reused, whatever the traffic. */
export const REPORT_TTL_MS = 60_000;

export type DeliveryCounts = {
  accepted: number;
  total: number;
  clientErrors: number;
  serverErrors: number;
  noResponse: number;
};

export type BotReliability = { days: number; runs: number; ok: number; prs: number };

/** What a probe returns. Free text here is checked before it is published. */
export type Outcome = {
  state: CheckState;
  detail: string;
  lastEventAt?: string | null;
  deliveries?: DeliveryCounts;
};

export type Probe = (signal: AbortSignal) => Promise<Outcome>;

export type CheckResult = {
  id: CheckId;
  state: CheckState;
  latencyMs: number | null;
  checkedAt: string;
  detail: string;
  lastEventAt: string | null;
  deliveries?: DeliveryCounts;
  retried: boolean;
};

export type PublicCheck = {
  id: CheckId;
  name: string;
  state: CheckState;
  latencyMs: number | null;
  checkedAt: string;
  detail: string;
  lastEventAt: string | null;
};

export type PublicReport = {
  overall: "operational" | "degraded" | "down";
  /** One plain sentence built from check names only. */
  reason: string;
  generatedAt: string;
  /** Seconds a report is reused before the checks run again. */
  refreshSeconds: number;
  database: "none";
  checks: PublicCheck[];
  /** FirstPRbot work across all repos, last 30 days. Aggregate counts only. */
  botLast30Days: BotReliability | null;
  /** Outcome of GitHub's most recent webhook deliveries, as counts only. */
  webhookDeliveries: DeliveryCounts | null;
};

export type RunOptions = {
  timeoutMs?: number;
  slowMs?: number;
  retryIfOverMs?: number;
  onError?: (id: CheckId, err: unknown) => void;
  now?: () => number;
};

class CheckTimeout extends Error {}

type Attempt =
  | { ok: true; outcome: Outcome; latencyMs: number }
  | { ok: false; timedOut: boolean; err: unknown };

async function attempt(probe: Probe, timeoutMs: number): Promise<Attempt> {
  const controller = new AbortController();
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new CheckTimeout());
    }, timeoutMs);
  });
  try {
    const outcome = await Promise.race([probe(controller.signal), timeout]);
    return { ok: true, outcome, latencyMs: Math.round(performance.now() - started) };
  } catch (err) {
    // An aborted request rejects with its own error before the timer's; both mean timeout.
    return { ok: false, timedOut: err instanceof CheckTimeout || controller.signal.aborted, err };
  } finally {
    clearTimeout(timer);
  }
}

export async function runCheck(id: CheckId, probe: Probe, opts: RunOptions = {}): Promise<CheckResult> {
  const timeoutMs = opts.timeoutMs ?? CHECK_TIMEOUT_MS;
  const slowMs = opts.slowMs ?? SLOW_MS;
  const retryIfOverMs = opts.retryIfOverMs ?? RETRY_IF_OVER_MS;
  const now = opts.now ?? Date.now;

  let result = await attempt(probe, timeoutMs);
  let retried = false;
  const coldLooking = result.ok
    ? result.outcome.state === "operational" && result.latencyMs > retryIfOverMs
    : result.timedOut;
  if (coldLooking) {
    retried = true;
    result = await attempt(probe, timeoutMs);
  }

  const checkedAt = new Date(now()).toISOString();
  if (!result.ok) {
    if (!result.timedOut) {
      try {
        opts.onError?.(id, result.err);
      } catch {
        // Reporting must never break the check.
      }
    }
    return {
      id,
      state: "down",
      latencyMs: null,
      checkedAt,
      detail: result.timedOut
        ? `No answer within ${timeoutMs / 1000} seconds.`
        : "The check could not reach it.",
      lastEventAt: null,
      retried,
    };
  }
  const slow = result.outcome.state === "operational" && result.latencyMs > slowMs;
  return {
    id,
    state: slow ? "degraded" : result.outcome.state,
    latencyMs: result.latencyMs,
    checkedAt,
    detail: slow ? `${result.outcome.detail} Slow to answer.` : result.outcome.detail,
    lastEventAt: result.outcome.lastEventAt ?? null,
    deliveries: result.outcome.deliveries,
    retried,
  };
}

// ---------- allowlist ----------

const STATES: readonly CheckState[] = ["operational", "degraded", "down", "unknown"];

const FALLBACK_DETAIL: Record<CheckState, string> = {
  operational: "Working.",
  degraded: "Working, but slow or partly failing.",
  down: "Not working right now.",
  unknown: "No data yet.",
};

/**
 * Detail sentences are fixed templates with numbers filled in. Anything that
 * looks like a URL, path, host, email, key=value, env name or token is refused.
 */
export function isSafeDetail(text: unknown): text is string {
  if (typeof text !== "string" || text.length === 0 || text.length > 220) return false;
  if (!/^[A-Za-z0-9 .,%'’()\-–:]+$/.test(text)) return false;
  if (/\bwww\b|\.(com|dev|io|net|org|app|local|internal)\b/i.test(text)) return false;
  if (/\d+\.\d+\.\d+/.test(text) || /-{2,}/.test(text)) return false;
  if (/\b(key|keys|token|secret|password|bearer|private|installation|begin)\b/i.test(text)) return false;
  // Long runs of letters mixed with digits look like keys or ids.
  for (const word of text.split(/[\s.,:()]+/)) {
    if (word.length >= 16 && /\d/.test(word) && /[A-Za-z]/.test(word)) return false;
    if (word.length >= 28) return false;
  }
  return true;
}

function safeState(s: unknown): CheckState {
  return STATES.includes(s as CheckState) ? (s as CheckState) : "unknown";
}

function safeIso(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

function safeCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function safeLatency(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null;
}

function safeDeliveries(d: DeliveryCounts | undefined): DeliveryCounts | null {
  if (!d) return null;
  return {
    accepted: safeCount(d.accepted),
    total: safeCount(d.total),
    clientErrors: safeCount(d.clientErrors),
    serverErrors: safeCount(d.serverErrors),
    noResponse: safeCount(d.noResponse),
  };
}

function safeReliability(r: BotReliability | null | undefined): BotReliability | null {
  if (!r) return null;
  return { days: safeCount(r.days), runs: safeCount(r.runs), ok: safeCount(r.ok), prs: safeCount(r.prs) };
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function overallOf(checks: { id: CheckId; state: CheckState }[]): PublicReport["overall"] {
  const core = checks.filter((c) => c.id === "website" || c.id === "api");
  if (core.some((c) => c.state === "down")) return "down";
  if (checks.some((c) => c.state === "down" || c.state === "degraded")) return "degraded";
  return "operational";
}

export function reasonOf(checks: { id: CheckId; state: CheckState }[]): string {
  const nameOf = (id: CheckId) => CHECKS.find((c) => c.id === id)?.name ?? "A check";
  const down = checks.filter((c) => c.state === "down").map((c) => nameOf(c.id));
  const slow = checks.filter((c) => c.state === "degraded").map((c) => nameOf(c.id));
  const waiting = checks.filter((c) => c.state === "unknown").length;
  const parts: string[] = [];
  if (down.length) parts.push(`${list(down)} ${down.length === 1 ? "is" : "are"} not answering.`);
  if (slow.length) parts.push(`${list(slow)} ${slow.length === 1 ? "is" : "are"} slow or partly failing.`);
  if (!parts.length) {
    const passing = checks.length - waiting;
    parts.push(`${passing} of ${checks.length} checks passed.`);
    if (waiting) parts.push(`${waiting === 1 ? "One check has" : `${waiting} checks have`} no data yet.`);
  }
  return parts.join(" ");
}

/** Copies only allowlisted fields. Nothing else from a probe can reach the public. */
export function toPublicReport(
  results: CheckResult[],
  botLast30Days: BotReliability | null,
  generatedAt: number,
  refreshSeconds = REPORT_TTL_MS / 1000,
): PublicReport {
  const checks: PublicCheck[] = CHECKS.map(({ id, name }) => {
    const r = results.find((x) => x.id === id);
    if (!r) {
      return { id, name, state: "unknown", latencyMs: null, checkedAt: new Date(generatedAt).toISOString(), detail: FALLBACK_DETAIL.unknown, lastEventAt: null };
    }
    const state = safeState(r.state);
    return {
      id,
      name,
      state,
      latencyMs: safeLatency(r.latencyMs),
      checkedAt: safeIso(r.checkedAt) ?? new Date(generatedAt).toISOString(),
      detail: isSafeDetail(r.detail) ? r.detail : FALLBACK_DETAIL[state],
      lastEventAt: safeIso(r.lastEventAt),
    };
  });
  return {
    overall: overallOf(checks),
    reason: reasonOf(checks),
    generatedAt: new Date(generatedAt).toISOString(),
    refreshSeconds,
    database: "none",
    checks,
    botLast30Days: safeReliability(botLast30Days),
    webhookDeliveries: safeDeliveries(results.find((r) => r.id === "bot")?.deliveries),
  };
}

// ---------- shared text helpers ----------

export function ago(iso: string, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs} s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/** A band instead of exact rate-limit numbers. */
export function quotaBand(remaining: number, limit: number): { low: boolean; text: string } {
  const pct = limit > 0 ? (remaining / limit) * 100 : 0;
  if (pct >= 50) return { low: false, text: "More than half of this hour's API quota is left." };
  if (pct >= 10) return { low: false, text: "Less than half of this hour's API quota is left." };
  return { low: true, text: "Under 10% of this hour's API quota is left." };
}
