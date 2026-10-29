import type { NextConfig } from "next";

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
