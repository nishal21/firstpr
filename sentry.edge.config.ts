// Sentry for the edge runtime (proxy and edge routes). Loaded by instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { serverDsn, sharedOptions } from "./lib/sentry-options.ts";

const dsn = serverDsn();

if (dsn) {
  Sentry.init({
    ...sharedOptions(dsn),
    tracePropagationTargets: [],
  });
}