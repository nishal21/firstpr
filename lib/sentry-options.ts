// Options shared by the browser, Node and edge Sentry SDKs.
// Every value is optional: with no DSN set, Sentry is never initialized.
import type { BrowserOptions, EdgeOptions, NodeOptions } from "@sentry/nextjs";
import { SAFE_REQUEST_HEADERS, scrubBreadcrumb, scrubEvent } from "./sentry-scrub.ts";

type SharedOptions = BrowserOptions & NodeOptions & EdgeOptions;

/** Commit SHA from Vercel, inlined at build time by next.config.ts. */
export const SENTRY_RELEASE = process.env.NEXT_PUBLIC_FIRSTPR_RELEASE || undefined;

/** "production", "preview" or "development". */
export const SENTRY_ENVIRONMENT =
  process.env.NEXT_PUBLIC_FIRSTPR_ENV || process.env.NODE_ENV || "development";

/** DSN for server and edge code. Falls back to the public browser DSN. */
export function serverDsn(): string | undefined {
  return process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
}

/** DSN baked into the browser bundle. */
export function clientDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN || undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(serverDsn());
}

export function tracesSampleRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE);
  if (Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  return SENTRY_ENVIRONMENT === "production" ? 0.1 : 1;
}

export function sharedOptions(dsn: string): SharedOptions {
  return {
    dsn,
    release: SENTRY_RELEASE,
    environment: SENTRY_ENVIRONMENT,
    tracesSampleRate: tracesSampleRate(),
    // No user identity, cookies, bodies, prompts or local variables.
    // lib/sentry-scrub.ts still runs on everything that is left.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: [...SAFE_REQUEST_HEADERS] }, response: false },
      httpBodies: [],
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // No Session Replay and no feedback widget.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    initialScope: { tags: { app: "firstpr" } },
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
      /^AbortError/,
    ],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-(web-)?extension:\/\//],
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  };
}