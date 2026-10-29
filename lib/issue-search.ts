import { getEnv } from "@/lib/env";
import { GitHubError } from "@/lib/github";
import { Octokit } from "@octokit/rest";

export type IssueSearchHit = {
  title: string;
  url: string;
  repo: string;
  number: number | null;
};

export type IssueSearchResult = {
  provider: "algolia" | "github";
  hits: IssueSearchHit[];
  configured: boolean;
};

function algoliaConfigured(): { appId: string; key: string; index: string } | null {
  const env = getEnv();
  const appId = env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const key = env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  if (!appId || !key) return null;
  return {
    appId,
    key,
    index: env.NEXT_PUBLIC_ALGOLIA_INDEX || "good_first_issues",
  };
}

export function isAlgoliaConfigured(): boolean {
  return algoliaConfigured() !== null;
}

function asHit(row: Record<string, unknown>): IssueSearchHit | null {
  const title = String(row.title ?? row.name ?? "").trim();
  const url = String(row.url ?? row.html_url ?? row.permalink ?? "").trim();
  if (!title || !url.startsWith("http")) return null;
  const repo = String(row.repo ?? row.repository ?? "").trim();
  const numberRaw = row.number ?? row.issue_number;
  const number = typeof numberRaw === "number" ? numberRaw : Number(numberRaw);
  return {
    title,
    url,
    repo,
    number: Number.isFinite(number) ? number : null,
  };
}

async function searchAlgolia(query: string): Promise<IssueSearchHit[]> {
  const cfg = algoliaConfigured();
  if (!cfg) return [];
  const endpoint = `https://${cfg.appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(cfg.index)}/query`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Algolia-Application-Id": cfg.appId,
      "X-Algolia-API-Key": cfg.key,
    },
    body: JSON.stringify({ query, hitsPerPage: 8 }),
  });
  if (!res.ok) {
    throw new Error(`Algolia search failed (${res.status})`);
  }
  const json = (await res.json()) as { hits?: Record<string, unknown>[] };
  return (json.hits ?? []).flatMap((hit) => {
    const mapped = asHit(hit);
    return mapped ? [mapped] : [];
  });
}

async function searchGitHub(query: string): Promise<IssueSearchHit[]> {
  const token = getEnv().GITHUB_TOKEN;
  const client = token ? new Octokit({ auth: token }) : new Octokit();
  const q = `${query} is:issue is:open label:"good first issue"`;
  try {
    const { data } = await client.search.issuesAndPullRequests({
      q,
      per_page: 8,
      sort: "updated",
    });
    return data.items.map((issue) => {
      const repoUrl = issue.repository_url ?? "";
      const repo = repoUrl.replace("https://api.github.com/repos/", "");
      return {
        title: issue.title,
        url: issue.html_url,
        repo,
        number: issue.number,
      };
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 403 || status === 429) {
      throw new GitHubError("GitHub search is rate limited. Try again shortly.", "rate_limited");
    }
    throw new GitHubError("GitHub search failed.", "github_error");
  }
}

export async function searchBeginnerIssues(rawQuery: string): Promise<IssueSearchResult> {
  const query = rawQuery.trim().replace(/["<>]/g, "").slice(0, 80);
  if (query.length < 2) {
    return { provider: isAlgoliaConfigured() ? "algolia" : "github", hits: [], configured: isAlgoliaConfigured() };
  }
  if (isAlgoliaConfigured()) {
    const hits = await searchAlgolia(query);
    return { provider: "algolia", hits, configured: true };
  }
  const hits = await searchGitHub(query);
  return { provider: "github", hits, configured: false };
}
