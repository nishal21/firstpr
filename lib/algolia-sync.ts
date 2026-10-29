import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import type { AlgoliaIssueRecord } from "@/lib/algolia-record";
import { getEnv } from "@/lib/env";
import {
  GitHubError,
  getSyncRateLimit,
  listStaleIssueObjectIds,
  searchOpenIssuePage,
  syncTokenSource,
  type RepoMeta,
  type SearchRate,
  type SyncTokenSource,
} from "@/lib/github";

export type SyncStopReason =
  | "done"
  | "time_budget"
  | "rate_limited"
  | "secondary_limit"
  | "busy";

export type SyncIssuesResult = {
  /** Issues saved by this run. */
  indexed: number;
  removed: number;
  /** True when this run finished a full pass over GitHub and pruned what it did not see. */
  complete: boolean;
  rateLimited: boolean;
  debug: {
    tokenSource: SyncTokenSource;
    stopReason: SyncStopReason;
    searches: number;
    elapsedMs: number;
    /** Issues saved so far in the current pass, across runs. */
    passIndexed: number;
    passStartedAt: string;
    /** Next run continues with issues created at or before this time. */
    cursor: string | null;
    githubTotal: number | null;
    search: SearchRate | null;
    graphql: SearchRate | null;
    rateLimitMessage: string | null;
  };
};

type AdminClient = ReturnType<typeof algoliasearch>;

type StoredIssue = AlgoliaIssueRecord & { sync_pass: number };

/** Kept in its own index so it never shows up in site search. */
type SyncState = {
  objectID: "cursor";
  /** Pass start, seconds. Records from older passes created before this are pruned at the end. */
  pass: number;
  /** Next page asks for issues created at or before this, seconds. Null once the pass is done. */
  cursor: number | null;
  passIndexed: number;
  lockUntil: number;
};

const INDEX_SETTINGS = {
  searchableAttributes: ["title", "repo", "labels", "language"],
  attributesForFaceting: ["language", "labels"],
  customRanking: ["desc(created_at)", "desc(stars)"],
  typoTolerance: true,
  attributesToHighlight: ["title", "repo"],
};

/** Stop starting new pages this long before the function limit (maxDuration 300). */
export const SYNC_BUDGET_MS = 250_000;
/** Time one page usually needs: search, repo lookup, and the Algolia write. */
const PAGE_RESERVE_MS = 25_000;
const LOCK_MS = 300_000;
const MAX_RATE_WAITS = 3;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function freshState(): SyncState {
  const pass = nowSeconds();
  return { objectID: "cursor", pass, cursor: pass, passIndexed: 0, lockUntil: 0 };
}

async function readState(client: AdminClient, indexName: string): Promise<SyncState> {
  try {
    const stored = (await client.getObject({ indexName, objectID: "cursor" })) as Partial<SyncState>;
    if (typeof stored.pass === "number") {
      return {
        objectID: "cursor",
        pass: stored.pass,
        cursor: typeof stored.cursor === "number" ? stored.cursor : null,
        passIndexed: typeof stored.passIndexed === "number" ? stored.passIndexed : 0,
        lockUntil: typeof stored.lockUntil === "number" ? stored.lockUntil : 0,
      };
    }
  } catch (err) {
    if ((err as { status?: number }).status !== 404) throw err;
  }
  return freshState();
}

async function writeState(client: AdminClient, indexName: string, state: SyncState): Promise<void> {
  await client.saveObject({ indexName, body: state });
}

/** Drop records an earlier pass saved that this full pass did not see. */
async function pruneOldPass(client: AdminClient, indexName: string, pass: number): Promise<number> {
  const stale: string[] = [];
  try {
    await client.browseObjects<{ objectID: string; sync_pass?: number; created_at?: number }>({
      indexName,
      browseParams: { attributesToRetrieve: ["objectID", "sync_pass", "created_at"] },
      aggregator: (response) => {
        for (const hit of response.hits) {
          const fromThisPass = hit.sync_pass === pass;
          const newerThanPass = typeof hit.created_at === "number" && hit.created_at > pass;
          if (hit.objectID && !fromThisPass && !newerThanPass) stale.push(hit.objectID);
        }
      },
    });
  } catch (err) {
    if ((err as { status?: number }).status === 404) return 0;
    throw err;
  }
  if (stale.length === 0) return 0;
  await client.deleteObjects({ indexName, objectIDs: stale });
  return stale.length;
}

function isSecondary(err: GitHubError): boolean {
  return /secondary rate limit|abuse detection/i.test(err.message);
}

/**
 * Walk GitHub's open beginner issues newest to oldest, one page per request, and upsert them.
 * The cursor lives in Algolia, so each run (daily cron or a manual call) picks up where the
 * last one stopped. A finished pass prunes closed or assigned issues it no longer saw.
 */
export async function syncIssuesIndex(): Promise<SyncIssuesResult> {
  const startedAt = Date.now();
  const deadline = startedAt + SYNC_BUDGET_MS;
  const env = getEnv();
  const appId = env.ALGOLIA_APP_ID;
  const adminKey = env.ALGOLIA_ADMIN_KEY;
  if (!appId || !adminKey) {
    throw new Error("Algolia admin credentials are not set");
  }
  const indexName = env.ALGOLIA_INDEX_NAME || ALGOLIA_INDEX_DEFAULT;
  const stateIndex = `${indexName}_sync_state`;
  const client = algoliasearch(appId, adminKey);

  const tokenSource = syncTokenSource();
  const limits = await getSyncRateLimit();
  let state = await readState(client, stateIndex);
  if (state.cursor === null) state = freshState();

  let indexed = 0;
  let removed = 0;
  let searches = 0;
  let complete = false;
  let stopReason: SyncStopReason = "time_budget";
  let githubTotal: number | null = null;
  let lastRate: SearchRate | null = limits?.search ?? null;
  let rateLimitMessage: string | null = null;

  const result = (): SyncIssuesResult => ({
    indexed,
    removed,
    complete,
    rateLimited: stopReason === "rate_limited" || stopReason === "secondary_limit",
    debug: {
      tokenSource,
      stopReason,
      searches,
      elapsedMs: Date.now() - startedAt,
      passIndexed: state.passIndexed,
      passStartedAt: new Date(state.pass * 1000).toISOString(),
      cursor: state.cursor === null ? null : new Date(state.cursor * 1000).toISOString(),
      githubTotal,
      search: lastRate,
      graphql: limits?.graphql ?? null,
      rateLimitMessage,
    },
  });

  if (state.lockUntil > Date.now()) {
    stopReason = "busy";
    return result();
  }
  state.lockUntil = Date.now() + LOCK_MS;
  await writeState(client, stateIndex, state);

  try {
    await client.setSettings({ indexName, indexSettings: INDEX_SETTINGS });
    const metaCache = new Map<string, RepoMeta | null>();
    let rateWaits = 0;
    let finished = false;

    while (state.cursor !== null) {
      if (Date.now() + PAGE_RESERVE_MS > deadline) {
        stopReason = "time_budget";
        break;
      }
      let page;
      try {
        searches += 1;
        page = await searchOpenIssuePage(state.cursor, metaCache);
      } catch (err) {
        if (!(err instanceof GitHubError) || err.code !== "rate_limited") throw err;
        rateLimitMessage = err.message.slice(0, 200);
        const delay = err.retryAfterMs > 0 ? err.retryAfterMs : 5_000;
        if (rateWaits < MAX_RATE_WAITS && Date.now() + delay + PAGE_RESERVE_MS < deadline) {
          rateWaits += 1;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        stopReason = isSecondary(err) ? "secondary_limit" : "rate_limited";
        break;
      }
      lastRate = page.rate;
      githubTotal = page.total;

      if (page.records.length > 0) {
        const objects: StoredIssue[] = page.records.map((record) => ({
          ...record,
          sync_pass: state.pass,
        }));
        await client.saveObjects({ indexName, objects });
        indexed += objects.length;
        state.passIndexed += objects.length;
      }

      if (page.hits < 100 && !page.incomplete) {
        finished = true;
        break;
      }
      if (page.oldestCreated !== null) {
        // Keep the boundary second so issues created at the same moment are not skipped.
        // If a whole page shares one second, step past it to keep moving.
        state.cursor =
          page.oldestCreated < state.cursor ? page.oldestCreated : page.oldestCreated - 1;
        await writeState(client, stateIndex, state);
      }
    }

    if (finished) {
      removed += await pruneOldPass(client, indexName, state.pass);
      state.cursor = null;
      complete = true;
      stopReason = "done";
    }

    // A pass takes several runs, so drop the most recently closed or assigned issues each run.
    if (!complete && stopReason === "time_budget") {
      try {
        searches += 1;
        const stale = await listStaleIssueObjectIds();
        if (stale.length > 0) {
          await client.deleteObjects({ indexName, objectIDs: stale });
          removed += stale.length;
        }
      } catch (err) {
        if (!(err instanceof GitHubError) || err.code !== "rate_limited") throw err;
      }
    }
  } finally {
    state.lockUntil = 0;
    await writeState(client, stateIndex, state);
  }

  return result();
}
