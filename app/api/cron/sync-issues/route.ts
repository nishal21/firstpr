import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { syncIssuesIndex } from "@/lib/algolia-sync";
import { getEnv } from "@/lib/env";
import { GitHubError } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(header);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function GET(request: Request) {
  const env = getEnv();
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
  }
  if (!authorized(request, env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!env.ALGOLIA_APP_ID || !env.ALGOLIA_ADMIN_KEY) {
    return NextResponse.json({ error: "algolia_not_configured" }, { status: 503 });
  }
  if (!env.GITHUB_TOKEN) {
    return NextResponse.json({ error: "github_not_configured" }, { status: 503 });
  }

  try {
    const result = await syncIssuesIndex();
    if (result.rateLimited && result.indexed === 0) {
      return NextResponse.json({ ok: false, error: "rate_limited", ...result }, { status: 429 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof GitHubError && err.code === "rate_limited") {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    const message = err instanceof Error ? err.message : "sync_failed";
    return NextResponse.json({ error: "sync_failed", message }, { status: 500 });
  }
}
