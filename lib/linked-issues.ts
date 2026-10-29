/**
 * Issue numbers this PR closes, in this repo only. Accepts `Fixes #12`,
 * `fixes: #12`, `Closes owner/repo#12` and full issue URLs.
 */
export function parseLinkedIssueNumbers(
  body: string | null,
  owner: string,
  repo: string,
): number[] {
  if (!body) return [];
  const self = `${owner}/${repo}`.toLowerCase();
  const re =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/|([\w.-]+\/[\w.-]+)#|#)(\d+)\b/gi;
  const nums = new Set<number>();
  for (const m of body.matchAll(re)) {
    const target = (m[1] ?? m[2])?.toLowerCase();
    if (target && target !== self) continue;
    const n = Number(m[3]);
    if (Number.isFinite(n) && n > 0) nums.add(n);
  }
  return [...nums];
}
