import type { MetadataRoute } from "next";

const base = "https://firstpr-coral.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/review", "/bot", "/ready", "/journey"];
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
