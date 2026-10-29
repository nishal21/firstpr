export type IssueRef = { owner: string; repo: string; number: number };

export function issuePath(ref: IssueRef): string {
  return `/issue/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/${ref.number}`;
}
