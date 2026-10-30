// Sentry for the Node.js runtime. Loaded by instrumentation.ts.
import * as Sentry from "@sentry/nextjs";
import { serverDsn, sharedOptions } from "./lib/sentry-options.ts";

const dsn = serverDsn();

if (dsn) {
  Sentry.init({
    ...sharedOptions(dsn),
    // Keep trace headers off calls to GitHub, OpenAI, Algolia and others.
    tracePropagationTargets: [],
  });
}