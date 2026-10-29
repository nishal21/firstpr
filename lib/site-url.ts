/**
 * The one place the public origin is configured. Set NEXT_PUBLIC_SITE_URL to
 * move the site to another domain; everything else (metadata, sitemap,
 * robots, llms.txt, JSON-LD, share images, bot comment links, and the
 * legacy-host redirect) reads it from here.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://firstpr.nishal.dev"
).replace(/\/+$/, "");

/** The original Vercel host. Requests to it are sent to SITE_URL. */
export const LEGACY_HOST = "firstpr-coral.vercel.app";
