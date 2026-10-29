import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME}: your first open-source PR`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#0473FD",
    categories: ["developer", "education", "productivity"],
    icons: [
      { src: "/brand/logo-mark-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/logo-mark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon-blue.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
