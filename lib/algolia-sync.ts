import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import type { AlgoliaIssueRecord } from "@/lib/algolia-record";
import {
  RECHECK_EVERY_S,
  fullPassDue,
  issueVerdict,
  nextUpdatedCursor,
  type DropReason,
} from "@/lib/algolia-sync-plan";
import { getEnv } from "@/lib/env";
import {
  GitHubError,
  SyncRateLimitError,
  checkIndexedIssues,
  getSyncRateLimit,
  listStaleIssueObjectIds,
  searchChangedIssuePage,
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

export type SyncMode = "full_pass" | "changes";

export type SyncIssuesResult = {
  /** Issues saved or refreshed by this run. */
  indexed: number;
  removed: number;
  /** True when this run finished a full pass over GitHub and pruned what it did not see. */
  complete: boolean;
  rateLimited: boolean;
  /** True when work is left that another run could pick up today. */
  more: boolean;
  debug: {
    tokenSource: SyncTokenSource;
    mode: SyncMode;
    stopReason: SyncStopReason;
    searches: number;
    elapsedMs: number;
    /** Issues saved so far in the current pass, across runs. */
    passIndexed: number;
    passStartedAt: string;
    /** Next full-pass page asks for issues created at or before this time. Null between passes. */
    cursor: string | null;
    lastFullPassAt: string | null;
    /** Change cursors: issues updated at or after these times are read next. */
    openSince: string | null;
    staleSince: string | null;
    rechecked: number;
    /** Why rechecked issues were dropped, by reason. */
    dropped: Partial<Record<DropReason, number>>;
    githubTotal: number | null;
    search: SearchRate | null;
    graphql: SearchRate | null;
    rateLimitMessage: string | null;
    /** Which API returned the limit that stopped or slowed this run. */
    limitedBy: "search" | "graphql" | null;
    rateWaits: number;
  };
};

type AdminClient = ReturnType<typeof algoliasearch>;

type StoredIssue = AlgoliaIssueRecord & { sync_pass: number; checked_at: number };

/** Kept in its own index so it never shows up in site search. */
type SyncState = {
  objectID: "cursor";
  /** Pass start, seconds. Records from older passes created before this are pruned at the end. */
  pass: number;
  /** Next page asks for issues created at or before this, seconds. Null once the pass is done. */
  cursor: number | null;
  passIndexed: number;
  lockUntil: number;
  /** When the last full pass started, seconds. Null until one finishes. */
  lastFullPass: number | null;
  /** Change cursors for the "open" and "stale" searches, seconds. */
  openSince: number | null;
  staleSince: number | null;
};

const INDEX_SETTINGS = {
  searchableAttributes: ["title", "repo", "labels", "language"],
  attributesForFaceting: ["language", "labels", "filterOnly(assignee)"],
  customRanking: ["desc(created_at)", "desc(stars)"],
  typoTolerance: true,
  attributesToHighlight: ["title", "repo"],
};

/** Stop starting new pages this long before the function limit (maxDuration 300). */
export const SYNC_BUDGET_MS = 250_000;
/** Time one page usually needs: search, repo lookup, and the Algolia write. */
const PAGE_RESERVE_MS = 25_000;
const LOCK_MS = 300_000;
const MAX_RATE_WAITS = 2;
/** Space sync searches out. Each one is slow on GitHub's side, which counts toward secondary limits. */
const PAGE_GAP_MS = 6_000;
/** GitHub asks for at least a minute after a secondary limit with no Retry-After. */
const SECONDARY_WAIT_MS = 65_000;
/** Records re-checked per run, 40 per GraphQL query. */
const RECHECK_LIMIT = 1_000;
/** A recheck batch of 1,000 takes about 40 s. */
const RECHECK_RESERVE_MS = 60_000;
/** First change cursor when none is stored: look back a day. */
const FIRST_CHANGES_LOOKBACK_S = 24 * 3600;

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function freshPass(previous?: SyncState): SyncState {
  const pass = nowSeconds();
  return {
    objectID: "cursor",
    pass,
    cursor: pass,
    passIndexed: 0,
    lockUntil: 0,
    lastFullPass: previous?.lastFullPass ?? null,
    openSince: previous?.openSince ?? null,
    staleSince: previous?.staleSince ?? null,
  };
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readState(client: AdminClient, indexName: string): Promise<SyncState> {
  try {
    const stored = (await client.getObject({ indexName, objectID: "cursor" })) as Partial<SyncState>;
    if (typeof stored.pass === "number") {
      return {
        objectID: "cursor",
        pass: stored.pass,
        cursor: num(stored.cursor),
        passIndexed: num(stored.passIndexed) ?? 0,
        lockUntil: num(stored.lockUntil) ?? 0,
        lastFullPass: num(stored.lastFullPass),
        openSince: num(stored.openSince),
        staleSince: num(stored.staleSince),
      };
    }
  } catch (err) {
    if ((err as { status?: number }).status !== 404) throw err;
  }
  return freshPass();
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

/** Records not re-checked within RECHECK_EVERY_S. Records saved before checked_at existed match too. */
async function dueForRecheck(client: AdminClient, indexName: string, now: number): Promise<string[]> {
  const response = await client.searchSingleIndex<{ objectID: string }>({
    indexName,
    searchParams: {
      query: "",
      filters: `NOT checked_at > ${now - RECHECK_EVERY_S}`,
      attributesToRetrieve: ["objectID"],
      attributesToHighlight: [],
      hitsPerPage: RECHECK_LIMIT,
    },
  });
  return response.hits.map((hit) => hit.objectID).filter(Boolean);
}

function isSecondary(err: GitHubError): boolean {
  return /secondary rate limit|abuse detection/i.test(err.message);
}

function iso(seconds: number | null): string | null {
  return seconds === null ? null : new Date(seconds * 1000).toISOString();
}

/**
 * Keeps the Algolia index in line with GitHub's open beginner issues.
 *
 * Full pass (first run, then monthly): walk issues newest to oldest by created time, one page
 * per request, and prune what the pass did not see. Between passes each run reads only what
 * changed: issues updated since the last run, both new candidates and ones that were closed,
 * assigned, locked or linked to a PR. Every run also re-checks up to 1,000 records whose last
 * check is a week old (labels, open PRs, archived, deleted or private repos).
 * All cursors live in Algolia, so any run picks up where the last one stopped.
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
  if (state.cursor === null && fullPassDue(state.lastFullPass, nowSeconds())) state = freshPass(state);
  const mode: SyncMode = state.cursor === null ? "changes" : "full_pass";

  let indexed = 0;
  let removed = 0;
  let searches = 0;
  let rechecked = 0;
  const dropped: Partial<Record<DropReason, number>> = {};
  let complete = false;
  let more = false;
  let stopReason: SyncStopReason = "time_budget";
  let githubTotal: number | null = null;
  let lastRate: SearchRate | null = limits?.search ?? null;
  let rateLimitMessage: string | null = null;
  let limitedBy: "search" | "graphql" | null = null;
  let rateWaits = 0;

  const result = (): SyncIssuesResult => ({
    indexed,
    removed,
    complete,
    more,
    rateLimited: stopReason === "rate_limited" || stopReason === "secondary_limit",
    debug: {
      tokenSource,
      mode,
      stopReason,
      searches,
      elapsedMs: Date.now() - startedAt,
      passIndexed: state.passIndexed,
      passStartedAt: new Date(state.pass * 1000).toISOString(),
      cursor: iso(state.cursor),
      lastFullPassAt: iso(state.lastFullPass),
      openSince: iso(state.openSince),
      staleSince: iso(state.staleSince),
      rechecked,
      dropped,
      githubTotal,
      search: lastRate,
      graphql: limits?.graphql ?? null,
      rateLimitMessage,
      limitedBy,
      rateWaits,
    },
  });

  if (state.lockUntil > Date.now()) {
    stopReason = "busy";
    return result();
  }
  state.lockUntil = Date.now() + LOCK_MS;
  await writeState(client, stateIndex, state);

  const metaCache = new Map<string, RepoMeta | null>();
  let firstPage = true;

  /** Wait between searches; on a rate limit, wait once or twice if time allows. Returns false to stop. */
  const pace = async (): Promise<boolean> => {
    if (Date.now() + PAGE_RESERVE_MS > deadline) {
      stopReason = "time_budget";
      more = true;
      return false;
    }
    if (!firstPage) await new Promise((resolve) => setTimeout(resolve, PAGE_GAP_MS));
    firstPage = false;
    return true;
  };
  const onLimit = async (err: unknown): Promise<boolean> => {
    if (!(err instanceof GitHubError) || err.code !== "rate_limited") throw err;
    rateLimitMessage = err.message.slice(0, 200);
    const secondary = err instanceof SyncRateLimitError ? err.secondary : isSecondary(err);
    if (err instanceof SyncRateLimitError) limitedBy = err.source;
    const delay = secondary
      ? Math.max(err.retryAfterMs, SECONDARY_WAIT_MS)
      : err.retryAfterMs > 0
        ? err.retryAfterMs
        : 5_000;
    if (rateWaits < MAX_RATE_WAITS && Date.now() + delay + PAGE_RESERVE_MS < deadline) {
      rateWaits += 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
      firstPage = true;
      return true;
    }
    stopReason = secondary ? "secondary_limit" : "rate_limited";
    more = false;
    return false;
  };

  try {
    await client.setSettings({ indexName, indexSettings: INDEX_SETTINGS });
    let limited = false;

    // Full pass: newest to oldest by created time.
    let finished = false;
    while (state.cursor !== null) {
      if (!(await pace())) break;
      let page;
      try {
        searches += 1;
        page = await searchOpenIssuePage(state.cursor, metaCache);
      } catch (err) {
        if (await onLimit(err)) continue;
        limited = true;
        break;
      }
      lastRate = page.rate;
      githubTotal = page.total;

      if (page.records.length > 0) {
        const checkedAt = nowSeconds();
        const objects: StoredIssue[] = page.records.map((record) => ({
          ...record,
          sync_pass: state.pass,
          checked_at: checkedAt,
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
      // Changes made while the pass ran are read by the next change search.
      state.lastFullPass = state.pass;
      state.openSince = state.pass;
      state.staleSince = state.pass;
      state.cursor = null;
      complete = true;
      await writeState(client, stateIndex, state);
    }

    // A pass takes several runs, so drop the most recently closed or assigned issues each run.
    if (state.cursor !== null && !limited) {
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

    // Between passes: read only what changed since the last run.
    if (state.cursor === null && !limited) {
      for (const kind of ["stale", "open"] as const) {
        let caughtUp = false;
        while (!caughtUp) {
          if (!(await pace())) break;
          const key = kind === "open" ? "openSince" : "staleSince";
          const since = state[key] ?? nowSeconds() - FIRST_CHANGES_LOOKBACK_S;
          let page;
          try {
            searches += 1;
            page = await searchChangedIssuePage(kind, since, metaCache);
          } catch (err) {
            if (await onLimit(err)) continue;
            limited = true;
            break;
          }
          if (page.records.length > 0) {
            const checkedAt = nowSeconds();
            // Partial updates: an existing record keeps its sync_pass, a new one is created.
            await client.partialUpdateObjects({
              indexName,
              objects: page.records.map((record) => ({ ...record, checked_at: checkedAt })),
              createIfNotExists: true,
            });
            indexed += page.records.length;
          }
          if (page.dropIds.length > 0) {
            await client.deleteObjects({ indexName, objectIDs: page.dropIds });
            removed += page.dropIds.length;
          }
          const fullPage = page.hits >= 100 || page.incomplete;
          const next = nextUpdatedCursor(since, page.maxUpdated, fullPage, nowSeconds());
          state[key] = next.since;
          caughtUp = next.caughtUp;
          await writeState(client, stateIndex, state);
        }
        if (limited || (!caughtUp && more)) break;
      }
    }

    // Every run: re-check records whose last check is a week old.
    if (!limited && Date.now() + RECHECK_RESERVE_MS < deadline) {
      const ids = await dueForRecheck(client, indexName, nowSeconds());
      if (ids.length > 0) {
        try {
          const facts = await checkIndexedIssues(ids);
          const checkedAt = nowSeconds();
          const drop: string[] = [];
          const keep: { objectID: string; checked_at: number; stars: number; language: string; labels: string[] }[] = [];
          for (const [objectID, fact] of facts) {
            const verdict = issueVerdict(fact);
            if (verdict.keep && fact.repo && fact.issue) {
              keep.push({
                objectID,
                checked_at: checkedAt,
                stars: fact.repo.stars,
                language: fact.repo.language,
                labels: fact.issue.labels.slice(0, 8),
              });
            } else if (!verdict.keep) {
              drop.push(objectID);
              dropped[verdict.reason] = (dropped[verdict.reason] ?? 0) + 1;
            }
          }
          if (drop.length > 0) {
            await client.deleteObjects({ indexName, objectIDs: drop });
            removed += drop.length;
          }
          if (keep.length > 0) {
            await client.partialUpdateObjects({ indexName, objects: keep, createIfNotExists: false });
          }
          rechecked = facts.size;
          if (ids.length >= RECHECK_LIMIT) more = true;
        } catch (err) {
          if (!(err instanceof GitHubError) || err.code !== "rate_limited") throw err;
          if (err instanceof SyncRateLimitError) limitedBy = err.source;
          rateLimitMessage = err.message.slice(0, 200);
          limited = true;
        }
      }
    } else if (!limited) {
      more = true;
    }

    if (limited) {
      more = false;
      if (stopReason === "time_budget") stopReason = "rate_limited";
    } else if (!more) {
      stopReason = "done";
    }
  } finally {
    state.lockUntil = 0;
    await writeState(client, stateIndex, state);
  }

  return result();
}
