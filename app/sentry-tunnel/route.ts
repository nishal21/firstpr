// Handler behind the `/monitoring` tunnel set in next.config.ts.
// Forwards browser Sentry envelopes without cookies or other request headers.
import { createSentryTunnelRoute } from "@sentry/nextjs/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const allowedDsns = [process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.SENTRY_DSN].filter(
    (dsn): dsn is string => Boolean(dsn),
  );
  if (allowedDsns.length === 0) return new Response(null, { status: 404 });
  return createSentryTunnelRoute({ allowedDsns }).POST(request);
}