import { algoliasearch } from "algoliasearch";
import { ALGOLIA_INDEX_DEFAULT } from "@/lib/algolia-plan";
import { getEnv } from "@/lib/env";
import type { BotReliability } from "@/lib/webhook-format";

/**
 * FirstPRbot run outcomes, kept cheaply in Algolia (the only store this app has):
 * one record per repo per UTC day plus one for all repos. Each run is a single
 * partial update with built-in counters. No payloads, comment text, or user names.
 */
export type BotRunKind = "pr" | "explain";

const WINDOW_DAYS = 30;
const ALL = "*";
const CLIENT_OPTIONS = { timeouts: { connect: 1000, read: 1500, write: 2000 } };
/** Reads sit in the webhook path, so they give up fast and the comment simply goes without the line. */
const READ_BUDGET_MS = 1500;

type DayRecord = {
  objectID: string;
  repo?: string;
  day?: string;
  runs?: number;
  ok?: number;
  /** PR numbers for a repo record, "owner/repo#n" for the all-repos record. */
  prs?: (number | string)[];
};

function client() {
  const env = getEnv();
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) return null;
  return algoliasearch(env.ALGOLIA_APP_ID, env.ALGOLIA_ADMIN_KEY, CLIENT_OPTIONS);
}

function indexName(): string {
  return `${getEnv().ALGOLIA_INDEX_NAME || ALGOLIA_INDEX_DEFAULT}_bot_runs`;
}

function dayKey(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function recordId(repo: string, day: string): string {
  return `${repo.toLowerCase()}|${day}`;
}

/** Record one finished bot job. Never throws; a failed write only costs one data point. */
export async function recordBotRun(run: {
  repo: string;
  kind: BotRunKind;
  /** PR number for kind "pr". */
  number?: number;
  ok: boolean;
}): Promise<void> {
  const c = client();
  if (!c) return;
  const now = Date.now();
  const day = dayKey(now);
  const repo = run.repo.toLowerCase();
  const common = {
    day,
    lastAt: new Date(now).toISOString(),
    lastKind: run.kind,
    lastOk: run.ok,
    runs: { _operation: "Increment", value: 1 },
    ok: { _operation: "Increment", value: run.ok ? 1 : 0 },
  };
  const pr = run.kind === "pr" && typeof run.number === "number";
  try {
    await c.partialUpdateObjects({
      indexName: indexName(),
      createIfNotExists: true,
      objects: [
        {
          objectID: recordId(repo, day),
          repo,
          ...common,
          ...(pr ? { prs: { _operation: "AddUnique", value: run.number } } : {}),
        },
        {
          objectID: recordId(ALL, day),
          repo: ALL,
          ...common,
          ...(pr ? { prs: { _operation: "AddUnique", value: `${repo}#${run.number}` } } : {}),
        },
      ],
    });
  } catch {
    // Best effort only.
  }
}

/** Last 30 UTC days for one repo, or for every repo with "*". Throws if Algolia fails. */
export async function readBotReliability(repo: string = ALL): Promise<BotReliability> {
  const c = client();
  if (!c) throw new Error("algolia_not_configured");
  const key = repo === ALL ? ALL : repo.toLowerCase();
  const now = Date.now();
  const ids = Array.from({ length: WINDOW_DAYS }, (_, i) => recordId(key, dayKey(now - i * 86_400_000)));
  let res: { results: (DayRecord | null)[] };
  try {
    res = await c.getObjects<DayRecord>({
      requests: ids.map((objectID) => ({ indexName: indexName(), objectID })),
    });
  } catch (err) {
    // No index yet means no runs yet.
    if ((err as { status?: number } | null)?.status === 404) return { days: WINDOW_DAYS, runs: 0, ok: 0, prs: 0 };
    throw err;
  }
  let runs = 0;
  let ok = 0;
  const prs = new Set<string>();
  for (const rec of res.results) {
    if (!rec) continue;
    runs += typeof rec.runs === "number" ? rec.runs : 0;
    ok += typeof rec.ok === "number" ? rec.ok : 0;
    for (const p of rec.prs ?? []) prs.add(String(p));
  }
  return { days: WINDOW_DAYS, runs, ok, prs: prs.size };
}

/** Same as readBotReliability, but null on any failure or slow answer. */
export async function readBotReliabilityQuick(repo: string): Promise<BotReliability | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      readBotReliability(repo),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), READ_BUDGET_MS);
      }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}