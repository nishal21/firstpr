import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import { getEnv } from "@/lib/env";

/** How one cron run of the issue sync ended, as shown on /status. */
export type LastSyncResult = "complete" | "partial" | "rate_limited" | "error";

/** Stored next to the sync cursor, in the state index that site search never reads. */
export type LastSyncRun = {
  objectID: "last_run";
  /** ISO time the run finished. */
  at: string;
  result: LastSyncResult;
  indexed: number;
  removed: number;
};

export type SyncSnapshot = {
  lastRun: LastSyncRun | null;
  /** Start of the indexing pass in progress, ISO, or null when no pass is open. */
  passStartedAt: string | null;
  passIndexed: number | null;
};

const RESULTS: readonly LastSyncResult[] = ["complete", "partial", "rate_limited", "error"];

/** Short timeouts: these calls run beside the sync or on the status page, never in a hot path. */
const CLIENT_OPTIONS = { timeouts: { connect: 1500, read: 2500, write: 2500 } };

function stateIndexName(): string {
  return `${getEnv().ALGOLIA_INDEX_NAME || ALGOLIA_INDEX_DEFAULT}_sync_state`;
}

function adminClient() {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) return null;
  return algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_ADMIN_KEY, CLIENT_OPTIONS);
}

/** One small write per cron run. Failures are ignored so the sync result never depends on it. */
export async function saveLastSyncRun(run: Omit<LastSyncRun, "objectID" | "at">): Promise<void> {
  const client = adminClient();
  if (!client) return;
  const body: LastSyncRun = { objectID: "last_run", at: new Date().toISOString(), ...run };
  try {
    await client.saveObject({ indexName: stateIndexName(), body });
  } catch {
    // Best effort only.
  }
}

function parseLastRun(raw: unknown): LastSyncRun | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) return null;
  if (!RESULTS.includes(r.result as LastSyncResult)) return null;
  return {
    objectID: "last_run",
    at: r.at,
    result: r.result as LastSyncResult,
    indexed: typeof r.indexed === "number" ? r.indexed : 0,
    removed: typeof r.removed === "number" ? r.removed : 0,
  };
}

function isNotFound(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 404;
}

/** Reads the last run and the open pass. Throws when Algolia cannot be reached. */
export async function readSyncSnapshot(): Promise<SyncSnapshot> {
  const client = adminClient();
  if (!client) throw new Error("algolia_not_configured");
  const indexName = stateIndexName();
  const [lastRaw, cursorRaw] = await Promise.all([
    client.getObject({ indexName, objectID: "last_run" }).catch((err) => {
      if (isNotFound(err)) return null;
      throw err;
    }),
    client.getObject({ indexName, objectID: "cursor" }).catch((err) => {
      if (isNotFound(err)) return null;
      throw err;
    }),
  ]);
  const cursor = (cursorRaw ?? {}) as { pass?: unknown; cursor?: unknown; passIndexed?: unknown };
  const open = typeof cursor.pass === "number" && typeof cursor.cursor === "number";
  return {
    lastRun: parseLastRun(lastRaw),
    passStartedAt: open ? new Date((cursor.pass as number) * 1000).toISOString() : null,
    passIndexed: open && typeof cursor.passIndexed === "number" ? cursor.passIndexed : null,
  };
}