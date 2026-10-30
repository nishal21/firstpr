// Sentry for the browser. Next.js runs this before the app hydrates.
import * as Sentry from "@sentry/nextjs";
import { clientDsn, sharedOptions } from "./lib/sentry-options.ts";

const dsn = clientDsn();

if (dsn) {
  Sentry.init({
    ...sharedOptions(dsn),
    // Same-origin requests only, so no trace headers reach other sites.
    tracePropagationTargets: [/^\//],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;