import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Bump when a page's copy changes in a way worth recrawling. */
const UPDATED = new Date("2026-10-29T00:00:00Z");

const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/explain", priority: 0.9, changeFrequency: "weekly" },
  { path: "/review", priority: 0.9, changeFrequency: "weekly" },
  { path: "/repo/nishal21/NekoDroid", priority: 0.5, changeFrequency: "weekly" },
  { path: "/issue/nishal21/NekoDroid/6", priority: 0.4, changeFrequency: "weekly" },
  { path: "/credits", priority: 0.3, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
  { path: "/llms.txt", priority: 0.3, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path === "/" ? "/" : route.path}`,
    lastModified: UPDATED,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
