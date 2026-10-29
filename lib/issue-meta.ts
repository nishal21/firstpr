import { GitHubError, getIssue } from "@/lib/github";

const NAME = /^[A-Za-z0-9_.-]{1,100}$/;

export type IssueMeta = {
  owner: string;
  repo: string;
  number: number;
  title: string | null;
  labels: string[];
  /** GitHub answered 404: the repo or issue does not exist (or is not public). */
  missing: boolean;
};

/** Issue title and labels for metadata and OG images. Never throws; title is null on failure. */
export async function loadIssueMeta(
  ownerRaw: string,
  repoRaw: string,
  numberRaw: string,
): Promise<IssueMeta | null> {
  const owner = decodeURIComponent(ownerRaw);
  const repo = decodeURIComponent(repoRaw);
  const number = Number(numberRaw);
  if (!NAME.test(owner) || !NAME.test(repo) || !Number.isInteger(number) || number < 1) return null;
  try {
    const issue = await getIssue(owner, repo, number);
    return { owner, repo, number, title: issue.title, labels: issue.labels.slice(0, 4), missing: false };
  } catch (err) {
    const missing = err instanceof GitHubError && err.code === "not_found";
    return { owner, repo, number, title: null, labels: [], missing };
  }
}
