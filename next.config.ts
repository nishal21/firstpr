import type { NextConfig } from "next";
import { LEGACY_HOST, SITE_URL } from "./lib/site-url";

const nextConfig: NextConfig = {
  /* config options here */
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
        source: "/:path((?!api/cron/|api/github/webhook).*)",
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

export default nextConfig;
