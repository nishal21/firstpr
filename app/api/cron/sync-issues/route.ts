import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { syncIssuesIndex } from "@/lib/algolia-sync";
import { hasBearerSecret, isVercelCron } from "@/lib/cron-auth";
import { getEnv } from "@/lib/env";
import { GitHubError } from "@/lib/github";
import { reportCronFailure, runMonitoredCron } from "@/lib/sentry-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Hobby with Fluid compute allows 300s. The sync stops starting new pages well before that.
export const maxDuration = 300;

const CRON_PATH = "/api/cron/sync-issues";

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
      if (result.rateLimited && result.indexed === 0) {
        return {
          outcome: "error",
          response: NextResponse.json({ ok: false, error: "rate_limited", ...result }, { status: 429 }),
        };
      }
      return { outcome: "ok", response: NextResponse.json({ ok: true, ...result }) };
    } catch (err) {
      if (err instanceof GitHubError && err.code === "rate_limited") {
        return {
          outcome: "error",
          response: NextResponse.json({ error: "rate_limited" }, { status: 429 }),
        };
      }
      Sentry.captureException(err, { tags: { cron: "sync-issues" } });
      const message = err instanceof Error ? err.message : "sync_failed";
      return {
        outcome: "error",
        response: NextResponse.json({ error: "sync_failed", message }, { status: 500 }),
      };
    }
  });
}