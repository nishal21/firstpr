import * as Sentry from "@sentry/nextjs";
import { after, NextResponse } from "next/server";
import { syncIssuesIndex, type SyncIssuesResult } from "@/lib/algolia-sync";
import { hasBearerSecret, isVercelCron } from "@/lib/cron-auth";
import { getEnv } from "@/lib/env";
import { GitHubError } from "@/lib/github";
import { reportCronFailure, runMonitoredCron } from "@/lib/sentry-report";
import { saveLastSyncRun } from "@/lib/sync-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hobby with Fluid compute allows 300s. The sync stops starting new pages well before that.
export const maxDuration = 300;

const CRON_PATH = "/api/cron/sync-issues";
/** Hobby only runs the cron once a day, so a run with work left starts the next one itself. */
const HOP_HEADER = "x-firstpr-sync-hop";
const MAX_HOPS = 9;

function hopNumber(request: Request): number {
  const raw = Number(request.headers.get(HOP_HEADER) ?? "0");
  return Number.isInteger(raw) && raw > 0 ? raw : 0;
}

/** Start the next run. It answers 202 at once and does its work after responding. */
async function startHop(origin: string, secret: string, hop: number): Promise<void> {
  try {
    const response = await fetch(`${origin}${CRON_PATH}`, {
      headers: { authorization: `Bearer ${secret}`, [HOP_HEADER]: String(hop) },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    // fetch does not throw on 401 or 409, so a refused hop would otherwise vanish.
    if (response.status !== 202) {
      Sentry.captureMessage(`Issue sync hop ${hop} was not accepted (HTTP ${response.status})`, {
        level: "warning",
        tags: { cron: "sync-issues", "sync.hop": String(hop) },
      });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { cron: "sync-issues", "sync.hop": String(hop) } });
  }
}

async function recordRun(result: SyncIssuesResult): Promise<void> {
  const stop = result.debug.stopReason;
  await saveLastSyncRun({
    result:
      result.complete || stop === "done"
        ? "complete"
        : stop === "rate_limited" || stop === "secondary_limit"
          ? "rate_limited"
          : "partial",
    indexed: result.indexed,
    removed: result.removed,
  });
}

export async function GET(request: Request) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    // A real Vercel run that cannot start still shows up as a failed check-in.
    if (isVercelCron(request)) await reportCronFailure(CRON_PATH);
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  // Unauthorized callers never touch the monitor.
  if (!hasBearerSecret(request, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const secret = env.CRON_SECRET;
  const origin = new URL(request.url).origin;
  const hop = hopNumber(request);

  if (hop > 0) {
    // Follow-up runs skip the Sentry monitor, which tracks the daily schedule.
    if (hop > MAX_HOPS || !env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
      return NextResponse.json({ ok: false, error: "hop_refused" }, { status: 409 });
    }
    after(async () => {
      try {
        const result = await syncIssuesIndex();
        if (result.debug.stopReason === "busy") return;
        await recordRun(result);
        if (result.more && hop < MAX_HOPS) await startHop(origin, secret, hop + 1);
      } catch (err) {
        if (err instanceof GitHubError && err.code === "rate_limited") return;
        Sentry.captureException(err, { tags: { cron: "sync-issues", "sync.hop": String(hop) } });
      }
    });
    return NextResponse.json({ accepted: true, hop }, { status: 202 });
  }

  return runMonitoredCron(CRON_PATH, async () => {
    if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
      return {
        outcome: "error",
        response: NextResponse.json({ error: "algolia_not_configured" }, { status: 503 }),
      };
    }
    if (!env.GITHUB_SYNC_TOKEN && !env.GITHUB_TOKEN) {
      return {
        outcome: "error",
        response: NextResponse.json({ error: "github_not_configured" }, { status: 503 }),
      };
    }

    try {
      const result = await syncIssuesIndex();
      if (result.debug.stopReason === "busy") {
        // Another run holds the lock; that run reports its own result.
        return {
          outcome: "ok",
          response: NextResponse.json(
            { ok: false, error: "sync_in_progress", ...result },
            { status: 409 },
          ),
        };
      }
      await recordRun(result);
      if (result.more) after(() => startHop(origin, secret, 1));
      if (result.rateLimited && result.indexed === 0) {
        return {
          outcome: "error",
          response: NextResponse.json({ ok: false, error: "rate_limited", ...result }, { status: 429 }),
        };
      }
      return { outcome: "ok", response: NextResponse.json({ ok: true, ...result }) };
    } catch (err) {
      if (err instanceof GitHubError && err.code === "rate_limited") {
        await saveLastSyncRun({ result: "rate_limited", indexed: 0, removed: 0 });
        return {
          outcome: "error",
          response: NextResponse.json({ error: "rate_limited" }, { status: 429 }),
        };
      }
      Sentry.captureException(err, { tags: { cron: "sync-issues" } });
      await saveLastSyncRun({ result: "error", indexed: 0, removed: 0 });
      const message = err instanceof Error ? err.message : "sync_failed";
      return {
        outcome: "error",
        response: NextResponse.json({ error: "sync_failed", message }, { status: 500 }),
      };
    }
  });
}
