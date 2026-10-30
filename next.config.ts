import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { LEGACY_HOST, SITE_URL } from "./lib/site-url";

// Vercel sets these at build time. Sentry uses them for releases and environments.
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "";
const deployEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN || "";
const githubRepo =
  process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : "nishal21/firstpr";

const nextConfig: NextConfig = {
  // Inlined into every bundle so browser, server and edge events share one release.
  env: {
    NEXT_PUBLIC_FIRSTPR_RELEASE: commitSha,
    NEXT_PUBLIC_FIRSTPR_ENV: deployEnv,
  },
  experimental: {
    agentFeedback: true,
  },
  // Off so app/api can export `runtime = "nodejs"` (required for Vercel Node APIs).
  // partialPrefetching requires cacheComponents, so both stay off.
  cacheComponents: false,
  // Share-image routes read their fonts and art from assets/og at request time.
  outputFileTracingIncludes: {
    "/**/opengraph-image*": ["./assets/og/**"],
    "/**/twitter-image*": ["./assets/og/**"],
  },
  partialPrefetching: false,
  // Send the old Vercel host to the canonical domain, path and query intact.
  // Cron and the GitHub webhook stay on the old host so existing callers keep working.
  async redirects() {
    if (new URL(SITE_URL).host === LEGACY_HOST) return [];
    return [
      {
        source: "/:path((?!api/cron/|api/github/webhook|monitoring).*)",
        has: [{ type: "host", value: LEGACY_HOST.replace(/\./g, "\\.") }],
        destination: `${SITE_URL}/:path`,
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Sentry wraps the config. Without SENTRY_AUTH_TOKEN it skips source map upload
// and release creation, and the build still passes.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "nkcodex",
  project: process.env.SENTRY_PROJECT || "firstpr",
  authToken: sentryAuthToken || undefined,
  silent: !process.env.CI,
  telemetry: false,
  widenClientFileUpload: true,
  // Browser events go through /monitoring on our own domain, so ad blockers do not drop them.
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !sentryAuthToken,
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    name: commitSha || undefined,
    create: Boolean(sentryAuthToken && commitSha),
    finalize: Boolean(sentryAuthToken && commitSha),
    setCommits:
      sentryAuthToken && commitSha
        ? { repo: githubRepo, commit: commitSha, ignoreMissing: true, ignoreEmpty: true }
        : false,
    deploy: sentryAuthToken && commitSha && process.env.VERCEL_ENV ? { env: deployEnv } : false,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },
  // A Sentry outage or bad token must never fail a deploy.
  errorHandler: (err) => {
    console.warn(`[sentry] build step skipped: ${err.message}`);
  },
});
