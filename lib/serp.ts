export type LearnLink = {
  title: string;
  link: string;
  snippet: string;
  site: string;
};

type OrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  source?: string;
};

const cache = new Map<string, LearnLink[]>();

const PREFERRED_HOSTS = [
  "doc.rust-lang.org",
  "developer.mozilla.org",
  "docs.python.org",
  "nodejs.org",
  "go.dev",
  "kotlinlang.org",
  "learn.microsoft.com",
  "docs.github.com",
  "react.dev",
  "nextjs.org",
  "typescriptlang.org",
  "web.dev",
  "rust-lang.github.io",
];

const BLOCKED_HOST_SNIPPETS = [
  "youtube.com/shorts",
  "youtu.be/shorts",
  "pinterest.",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "spam",
];

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlocked(link: string, title: string): boolean {
  const lowerLink = link.toLowerCase();
  const lowerTitle = title.toLowerCase();
  if (BLOCKED_HOST_SNIPPETS.some((b) => lowerLink.includes(b))) return true;
  if (/youtube\.com\/shorts|\/shorts\//i.test(lowerLink)) return true;
  if (/short\b/i.test(lowerTitle) && /youtube/i.test(lowerLink)) return true;
  // Thin affiliate / content-farm signals
  if (/\b(buy now|click here|free download crack)\b/i.test(lowerTitle)) {
    return true;
  }
  return false;
}

function preferenceScore(link: string): number {
  const host = hostnameOf(link);
  const preferredIndex = PREFERRED_HOSTS.findIndex(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (preferredIndex >= 0) return 100 - preferredIndex;
  if (host.includes("docs.") || host.startsWith("docs")) return 40;
  if (/tutorial|guide|learn|book/i.test(link)) return 20;
  if (/medium\.com|dev\.to|stackoverflow\.com/i.test(host)) return 10;
  return 0;
}

function toLearnLink(row: OrganicResult): LearnLink | null {
  const title = row.title?.trim();
  const link = row.link?.trim();
  if (!title || !link) return null;
  if (isBlocked(link, title)) return null;
  const site = hostnameOf(link) || row.source?.trim() || "web";
  return {
    title,
    link,
    snippet: row.snippet?.trim() || "",
    site,
  };
}

function rankAndTake(results: OrganicResult[], limit = 3): LearnLink[] {
  const mapped = results
    .map(toLearnLink)
    .filter((x): x is LearnLink => x != null);

  mapped.sort((a, b) => preferenceScore(b.link) - preferenceScore(a.link));

  const seen = new Set<string>();
  const out: LearnLink[] = [];
  for (const item of mapped) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Search Google via SerpApi for beginner learning links.
 * Returns [] when the key is missing or the call fails — never throws.
 */
export async function learnLinks(query: string): Promise<LearnLink[]> {
  const q = query.trim();
  if (!q) return [];

  const cached = cache.get(q);
  if (cached) return cached;

  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", q);
    url.searchParams.set("num", "5");
    url.searchParams.set("api_key", apiKey);

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(6_000),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`[serp] learnLinks failed: HTTP ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      organic_results?: OrganicResult[];
      error?: string;
    };

    if (data.error) {
      console.warn(`[serp] learnLinks error: ${data.error}`);
      return [];
    }

    const links = rankAndTake(data.organic_results ?? [], 3);
    cache.set(q, links);
    return links;
  } catch (err) {
    console.warn(
      "[serp] learnLinks failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}
