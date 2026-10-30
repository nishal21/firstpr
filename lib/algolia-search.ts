import { liteClient } from "algoliasearch/lite";
import {
  ALGOLIA_INDEX_DEFAULT,
  algoliaQueryPlan,
  highlightParts,
  parseIssueObjectId,
  type HighlightPart,
} from "@/lib/algolia-plan";

export type AlgoliaLiveHit = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  labels: string[];
  createdAt?: string;
  titleParts?: HighlightPart[];
  detailParts?: HighlightPart[];
};

type StoredHit = {
  objectID?: string;
  title?: string;
  repo?: string;
  labels?: string[];
  created_at?: number;
  assignee?: string;
  assigned?: number;
  _highlightResult?: {
    title?: { value?: string };
    repo?: { value?: string };
  };
};

let browserClient: ReturnType<typeof liteClient> | null = null;

export function algoliaSearchEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_ALGOLIA_APP_ID && process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY,
  );
}

function client() {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const apiKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  if (!appId || !apiKey) return null;
  if (!browserClient) browserClient = liteClient(appId, apiKey);
  return browserClient;
}

function stringLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  for (const item of value as unknown[]) {
    if (typeof item === "string") labels.push(item);
    if (labels.length === 3) break;
  }
  return labels;
}

function marked(value: string | undefined): HighlightPart[] | undefined {
  if (!value || !value.includes("<em>")) return undefined;
  return highlightParts(value);
}

/** Number of records in the issue index. Null when Algolia is not configured. */
export async function algoliaIndexedCount(): Promise<number | null> {
  const searchClient = client();
  if (!searchClient) return null;
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME?.trim() || ALGOLIA_INDEX_DEFAULT;
  const response = await searchClient.search({
    requests: [{ indexName, query: "", hitsPerPage: 0 }],
  });
  const first = response.results[0];
  if (!first || !("nbHits" in first) || typeof first.nbHits !== "number") return null;
  return first.nbHits;
}

/** Browser search. Throws when Algolia is unreachable so the caller can use GitHub. */
export async function searchAlgoliaIssues(
  raw: string,
  language?: string,
): Promise<AlgoliaLiveHit[]> {
  const searchClient = client();
  if (!searchClient) return [];
  const plan = algoliaQueryPlan(raw, language);
  if (plan.query.length < 2) return [];
  const indexName = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME?.trim() || ALGOLIA_INDEX_DEFAULT;
  const response = await searchClient.search<StoredHit>({
    requests: [
      {
        indexName,
        query: plan.query,
        hitsPerPage: 5,
        attributesToHighlight: ["title", "repo"],
        // Never show an issue the index knows is assigned. Numeric, so no facet setting is needed.
        filters: plan.filters ? `${plan.filters} AND NOT assigned > 0` : "NOT assigned > 0",
      },
    ],
  });
  const first = response.results[0];
  if (!first || !("hits" in first) || !Array.isArray(first.hits)) return [];
  const hits: AlgoliaLiveHit[] = [];
  for (const hit of first.hits) {
    const parsed = parseIssueObjectId(hit.objectID ?? "");
    if (!parsed || !hit.title) continue;
    if (hit.assignee === "assigned" || (hit.assigned ?? 0) > 0) continue;
    const created =
      typeof hit.created_at === "number" ? new Date(hit.created_at * 1000).toISOString() : undefined;
    hits.push({
      owner: parsed.owner,
      repo: parsed.repo,
      number: parsed.number,
      title: hit.title,
      labels: stringLabels(hit.labels),
      createdAt: created,
      titleParts: marked(hit._highlightResult?.title?.value),
      detailParts: marked(hit._highlightResult?.repo?.value),
    });
  }
  return hits;
}
