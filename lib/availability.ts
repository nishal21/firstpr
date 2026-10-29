import {
  getIssue,
  listIssueComments,
  listLinkedPulls,
  type IssueComment,
  type LinkedPull,
} from "@/lib/github";

/** First-person claims only. "Please take this" from a maintainer does not match. */
export const CLAIM_RE =
  /\b(i(?:['’])?ll|i will|i(?:['’])?m|i am)\b[\s\S]{0,48}\b(take|taking|work|working|claim|grab|on it)\b|\b(assign me|count me in|i can take (this|it))\b/i;

export const RELEASE_RE =
  /\b(can(?:['’])?t|cannot|no longer|unassign|stepping back|someone else|won(?:['’])?t be able)\b/i;

const CLAIM_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;

export type AvailabilityStatus =
  | "free"
  | "assigned"
  | "linked_pr"
  | "claimed"
  | "closed"
  | "unknown";

export type ClaimHit = {
  user: string;
  createdAt: string;
  excerpt: string;
};

export type Availability = {
  status: AvailabilityStatus;
  assignees: string[];
  openPulls: LinkedPull[];
  claims: ClaimHit[];
  /** False when the comment list could not be loaded. */
  commentsChecked: boolean;
  summary: string;
};

export function excerpt(body: string): string {
  const line = body.replace(/\s+/g, " ").trim();
  if (line.length <= 140) return line;
  return `${line.slice(0, 137)}…`;
}

/**
 * Recent first-person claims that the same person has not walked back.
 * Comments are oldest-first or newest-first; order is sorted here.
 */
export function findClaims(
  comments: IssueComment[],
  now = Date.now(),
): ClaimHit[] {
  const ordered = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const released = new Set<string>();
  for (const comment of ordered) {
    if (!comment.user || comment.isBot) continue;
    if (RELEASE_RE.test(comment.body)) released.add(comment.user.toLowerCase());
  }

  const hits: ClaimHit[] = [];
  for (const comment of ordered) {
    if (!comment.user || comment.isBot) continue;
    const user = comment.user.toLowerCase();
    if (released.has(user)) continue;
    if (!CLAIM_RE.test(comment.body)) continue;
    const at = new Date(comment.createdAt).getTime();
    if (Number.isNaN(at) || now - at > CLAIM_WINDOW_MS) continue;
    hits.push({
      user: comment.user,
      createdAt: comment.createdAt,
      excerpt: excerpt(comment.body),
    });
  }
  return hits;
}

export function judgeAvailability(input: {
  state: "open" | "closed";
  assignees: string[];
  pulls: LinkedPull[];
  comments: IssueComment[] | null;
  now?: number;
}): Availability {
  const openPulls = input.pulls.filter((pull) => pull.state === "open");
  const commentsChecked = input.comments !== null;
  const claims = input.comments ? findClaims(input.comments, input.now) : [];

  if (input.state === "closed") {
    return {
      status: "closed",
      assignees: input.assignees,
      openPulls,
      claims,
      commentsChecked,
      summary: "This issue is closed.",
    };
  }

  if (input.assignees.length > 0) {
    return {
      status: "assigned",
      assignees: input.assignees,
      openPulls,
      claims,
      commentsChecked,
      summary: `Assigned to @${input.assignees[0]}.`,
    };
  }

  if (openPulls.length > 0) {
    const first = openPulls[0];
    const who = first.user ? ` by @${first.user}` : "";
    return {
      status: "linked_pr",
      assignees: input.assignees,
      openPulls,
      claims,
      commentsChecked,
      summary: `Open pull request #${first.number}${who} already links this issue.`,
    };
  }

  if (claims.length > 0) {
    const latest = claims[claims.length - 1];
    return {
      status: "claimed",
      assignees: input.assignees,
      openPulls,
      claims,
      commentsChecked,
      summary: `@${latest.user} claimed it in the last 21 days.`,
    };
  }

  if (!commentsChecked) {
    return {
      status: "unknown",
      assignees: input.assignees,
      openPulls,
      claims,
      commentsChecked,
      summary:
        "No assignee and no open linked PR. Comments could not be loaded, so a recent claim might be missing.",
    };
  }

  return {
    status: "free",
    assignees: input.assignees,
    openPulls,
    claims,
    commentsChecked,
    summary: "No assignee, no open linked PR, and no recent first-person claim.",
  };
}

export async function inspectIssueAvailability(
  owner: string,
  repo: string,
  number: number,
): Promise<Availability> {
  const issue = await getIssue(owner, repo, number);
  const [pulls, comments] = await Promise.all([
    listLinkedPulls(owner, repo, number),
    listIssueComments(owner, repo, number).catch(() => null),
  ]);
  return judgeAvailability({
    state: issue.state,
    assignees: issue.assignees,
    pulls,
    comments,
  });
}
