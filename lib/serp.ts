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

/** Default preferred docs hosts (lower index = higher score). */
const PREFERRED_HOSTS = [
  "doc.rust-lang.org",
  "rust-lang.github.io",
  "developer.mozilla.org",
  "typescriptlang.org",
  "docs.python.org",
  "nodejs.org",
  "go.dev",
  "kotlinlang.org",
  "learn.microsoft.com",
  "docs.github.com",
  "react.dev",
  "nextjs.org",
  "web.dev",
];

/** Extra boost for official docs by language. */
const LANG_BOOST_HOSTS: Record<string, string[]> = {
  rust: ["doc.rust-lang.org", "rust-lang.github.io"],
  javascript: ["developer.mozilla.org", "nodejs.org", "web.dev"],
  typescript: ["typescriptlang.org", "developer.mozilla.org"],
  python: ["docs.python.org"],
  go: ["go.dev", "pkg.go.dev"],
};

const BLOCKED_HOST_SNIPPETS = [
  "youtube.com/shorts",
  "youtu.be/shorts",
  "pinterest.",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "spam",
];

const KNOWN_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Rust",
  "Python",
  "Kotlin",
  "Java",
  "Go",
  "Ruby",
  "Swift",
  "C++",
  "C#",
  "PHP",
  "Scala",
  "Dart",
] as const;

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
  if (/\b(buy now|click here|free download crack)\b/i.test(lowerTitle)) {
    return true;
  }
  return false;
}

function normalizeLangKey(language: string): string {
  return language.trim().toLowerCase();
}

/** Tokens that count as "mentioning" this language in a title/snippet. */
export function languageAliases(language: string): string[] {
  const key = normalizeLangKey(language);
  if (key === "typescript" || key === "ts") {
    return ["typescript", "javascript", "ts", "js"];
  }
  if (key === "javascript" || key === "js") {
    return ["javascript", "js", "ecmascript", "dom"];
  }
  if (key === "rust") return ["rust"];
  if (key === "c++" || key === "cpp") return ["c++", "cpp"];
  if (key === "c#") return ["c#", "csharp", ".net"];
  if (key === "go" || key === "golang") return ["go", "golang"];
  return [key];
}

export function queryMentionsLanguage(query: string, language: string): boolean {
  const text = query.toLowerCase();
  return languageAliases(language).some((alias) => {
    if (alias.length <= 2) {
      return new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
        text,
      );
    }
    return text.includes(alias);
  });
}

function isOfficialDocsHost(link: string, language: string): boolean {
  const host = hostnameOf(link);
  const boosts = LANG_BOOST_HOSTS[normalizeLangKey(language)] ?? [];
  return boosts.some((h) => host === h || host.endsWith(`.${h}`));
}

export function mentionsLanguage(
  title: string,
  snippet: string,
  language: string,
  link?: string,
): boolean {
  // Official docs for this language count even when the title omits the word
  // (common on MDN: "Window: alert() method").
  if (link && isOfficialDocsHost(link, language)) return true;

  const blob = `${title} ${snippet}`.toLowerCase();
  if (/javascript|typescript/.test(normalizeLangKey(language))) {
    if (/\bmdn\b|mozilla/i.test(blob)) return true;
  }

  return languageAliases(language).some((alias) => {
    if (alias.length <= 2) {
      return new RegExp(
        `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      ).test(blob);
    }
    return blob.includes(alias);
  });
}

/**
 * If a concept term already starts with a known language/tool, use that;
 * otherwise fall back to the repo primary language.
 */
export function detectLanguageInPhrase(
  phrase: string,
  fallback: string | null,
): string | null {
  const trimmed = phrase.trim();
  if (!trimmed) return fallback;
  for (const lang of KNOWN_LANGUAGES) {
    if (trimmed.toLowerCase().startsWith(lang.toLowerCase())) {
      return lang;
    }
  }
  // Short aliases at the start: "JS ", "TS ", "Go "
  const first = trimmed.split(/\s+/)[0] ?? "";
  if (/^(js|javascript)$/i.test(first)) return "JavaScript";
  if (/^(ts|typescript)$/i.test(first)) return "TypeScript";
  if (/^golang$/i.test(first)) return "Go";
  return fallback;
}

function preferenceScore(link: string, language?: string | null): number {
  const host = hostnameOf(link);
  let score = 0;

  const preferredIndex = PREFERRED_HOSTS.findIndex(
    (h) => host === h || host.endsWith(`.${h}`),
  );
  if (preferredIndex >= 0) score += 100 - preferredIndex;
  else if (host.includes("docs.") || host.startsWith("docs")) score += 40;
  else if (/tutorial|guide|learn|book/i.test(link)) score += 20;
  else if (/medium\.com|dev\.to|stackoverflow\.com/i.test(host)) score += 10;

  if (language) {
    const boosts = LANG_BOOST_HOSTS[normalizeLangKey(language)] ?? [];
    const boostIndex = boosts.findIndex(
      (h) => host === h || host.endsWith(`.${h}`),
    );
    if (boostIndex >= 0) score += 200 - boostIndex * 15;
  }

  return score;
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

function rankAndTake(
  results: OrganicResult[],
  language: string | null,
  limit = 3,
): LearnLink[] {
  const mapped = results
    .map(toLearnLink)
    .filter((x): x is LearnLink => x != null);

  mapped.sort(
    (a, b) =>
      preferenceScore(b.link, language) - preferenceScore(a.link, language),
  );

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

async function serpSearch(q: string, apiKey: string): Promise<OrganicResult[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("num", "10");
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

  return data.organic_results ?? [];
}

function filterByLanguage(
  links: LearnLink[],
  lang: string | null,
): LearnLink[] {
  if (!lang) return links;
  return links.filter((item) =>
    mentionsLanguage(item.title, item.snippet, lang, item.link),
  );
}

/**
 * Search Google via SerpApi for beginner learning links.
 * Prepends `language` to the query when missing; drops hits that never
 * mention the language (official docs hosts always count). Returns [] on
 * failure — never throws.
 */
export async function learnLinks(
  query: string,
  language?: string | null,
): Promise<LearnLink[]> {
  let q = query.trim();
  if (!q) return [];

  const lang = language?.trim() || null;
  if (lang && !queryMentionsLanguage(q, lang)) {
    q = `${lang} ${q}`;
  }

  // Nudge Google toward official docs for JS/TS (MDN titles often omit "JavaScript").
  const langKey = lang ? normalizeLangKey(lang) : "";
  if (
    (langKey === "javascript" || langKey === "typescript") &&
    !/\bmdn\b/i.test(q)
  ) {
    q = `${q} MDN`;
  }

  const cacheKey = `${lang ?? ""}::${q}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  try {
    const organic = await serpSearch(q, apiKey);
    let links = filterByLanguage(rankAndTake(organic, lang, 8), lang);

    // If still thin on official docs, try a site-scoped search.
    const hasOfficial = lang
      ? links.some((l) => isOfficialDocsHost(l.link, lang))
      : false;
    if (lang && !hasOfficial) {
      const site =
        langKey === "rust"
          ? "site:doc.rust-lang.org OR site:rust-lang.github.io"
          : langKey === "typescript"
            ? "site:developer.mozilla.org OR site:www.typescriptlang.org"
            : langKey === "javascript"
              ? "site:developer.mozilla.org"
              : null;
      if (site) {
        const scoped = await serpSearch(`${query.trim()} ${site}`, apiKey);
        const extra = filterByLanguage(rankAndTake(scoped, lang, 5), lang);
        const seen = new Set(links.map((l) => l.link));
        for (const item of extra) {
          if (seen.has(item.link)) continue;
          links.push(item);
          seen.add(item.link);
        }
        links.sort(
          (a, b) =>
            preferenceScore(b.link, lang) - preferenceScore(a.link, lang),
        );
      }
    }

    links = links.slice(0, 3);
    cache.set(cacheKey, links);
    return links;
  } catch (err) {
    console.warn(
      "[serp] learnLinks failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Collect learn links for explain concepts. Hides the section when fewer
 * than 2 language-relevant results remain.
 */
export async function gatherLearnLinks(
  concepts: { term: string }[],
  repoLanguage: string | null,
): Promise<LearnLink[]> {
  const seen = new Set<string>();
  const out: LearnLink[] = [];

  for (const concept of concepts.slice(0, 3)) {
    const term = concept.term.trim();
    if (!term) continue;
    const lang = detectLanguageInPhrase(term, repoLanguage);
    const links = await learnLinks(term, lang);
    for (const link of links) {
      if (seen.has(link.link)) continue;
      seen.add(link.link);
      out.push(link);
      if (out.length >= 3) break;
    }
    if (out.length >= 3) break;
  }

  return out.length >= 2 ? out : [];
}
