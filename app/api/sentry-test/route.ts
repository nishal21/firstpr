// Sends one test error to Sentry so you can confirm the DSN works.
// Needs the cron secret: `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/sentry-test`
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { hasBearerSecret } from "@/lib/cron-auth";
import { getEnv } from "@/lib/env";
import { isSentryEnabled, SENTRY_ENVIRONMENT, SENTRY_RELEASE } from "@/lib/sentry-options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = getEnv().CRON_SECRET;
  if (!secret || !hasBearerSecret(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSentryEnabled()) {
    return NextResponse.json({ ok: false, error: "sentry_not_configured" }, { status: 503 });
  }

  const eventId = Sentry.captureException(new Error("FirstPR Sentry test error"), {
    level: "info",
    tags: { "firstpr.test": "true" },
  });
  const flushed = await Sentry.flush(3000);

  return NextResponse.json({
    ok: flushed,
    eventId,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE ?? null,
  });
}