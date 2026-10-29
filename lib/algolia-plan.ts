/** Pure helpers for Algolia queries. No SDK and no secrets. */

export type HighlightPart = { text: string; mark: boolean };

const LANGUAGES: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  rust: "Rust",
  go: "Go",
  java: "Java",
  ruby: "Ruby",
};

export const ALGOLIA_INDEX_DEFAULT = "firstpr_issues";

export type AlgoliaPlan = {
  query: string;
  filters?: string;
};

export function parseIssueObjectId(
  objectID: string,
): { owner: string; repo: string; number: number } | null {
  const [owner, repo, raw] = objectID.split("/");
  const number = Number(raw);
  if (!owner || !repo || objectID.split("/").length !== 3 || !Number.isInteger(number) || number < 1) {
    return null;
  }
  return { owner, repo, number };
}

export function algoliaQueryPlan(raw: string, language?: string): AlgoliaPlan {
  const query = raw.trim();
  const lower = query.toLowerCase();
  const filters: string[] = [];
  const langKey = (language ?? "").trim().toLowerCase();
  const facetLanguage = LANGUAGES[langKey] || LANGUAGES[lower];
  if (facetLanguage) filters.push(`language:${facetLanguage}`);
  if (lower === "docs" || lower === "documentation") {
    filters.push("(labels:documentation OR labels:docs)");
  }
  if (lower === "good first issue" || lower === "good-first-issue") {
    filters.push('labels:"good first issue"');
  }
  return { query, filters: filters.length > 0 ? filters.join(" AND ") : undefined };
}

export function issueObjectId(owner: string, repo: string, number: number): string {
  return `${owner}/${repo}/${number}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Split an Algolia highlight string. Only `<em>` marks are kept. */
export function highlightParts(value: string): HighlightPart[] {
  const parts: HighlightPart[] = [];
  const pattern = /<em>([\s\S]*?)<\/em>/g;
  let last = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ text: decodeEntities(stripTags(value.slice(last, index))), mark: false });
    }
    parts.push({ text: decodeEntities(stripTags(match[1] ?? "")), mark: true });
    last = index + match[0].length;
  }
  if (last < value.length) {
    parts.push({ text: decodeEntities(stripTags(value.slice(last))), mark: false });
  }
  if (parts.length === 0) return [{ text: decodeEntities(stripTags(value)), mark: false }];
  return parts;
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}
