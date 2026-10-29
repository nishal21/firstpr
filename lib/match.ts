import { inspectIssueAvailability, type Availability } from "@/lib/availability";
import { assessDifficulty, difficultyBadgeLabel } from "@/lib/difficulty";
import { env } from "@/lib/env";
import {
  getRepo,
  getUserLanguages,
  GitHubError,
  issueHasOpenLinkedPr,
  listGoodFirstIssues,
  parseRepo,
  REPO_NOT_FOUND_MSG,
  searchGoodFirstIssues,
  type GoodFirstIssue,
} from "@/lib/github";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type ScoredIssue = GoodFirstIssue & {
  owner: string;
  repo: string;
  score: number;
  fitReason: string;
  difficulty: DifficultyLevel;
  difficultyReason: string;
  /** UI label: Beginner-friendly | Stretch */
  difficultyBadge: string;
  availability?: Availability;
};

export type SkippedIssue = GoodFirstIssue & {
  owner: string;
  repo: string;
  reason: string;
};

export type MatchResult = {
  languages: string[];
  picked: ScoredIssue | null;
  others: ScoredIssue[];
  skipped: SkippedIssue[];
};

const LANG_EXTENSIONS: Record<string, string[]> = {
  TypeScript: [".ts", ".tsx"],
  JavaScript: [".js", ".jsx", ".mjs", ".cjs"],
  Rust: [".rs"],
  Python: [".py"],
  Markdown: [".md"],
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function parseOwnerRepoFromIssueUrl(htmlUrl: string): {
  owner: string;
  repo: string;
} | null {
  const match = htmlUrl.match(
    /github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/\d+/i,
  );
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

function withRepo(
  issue: GoodFirstIssue,
  owner: string,
  repo: string,
): GoodFirstIssue & { owner: string; repo: string } {
  return { ...issue, owner, repo };
}

function isOlderThanOneYear(createdAt: string): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t > ONE_YEAR_MS;
}

function scoreIssue(
  issue: GoodFirstIssue,
  languages: string[],
): { score: number; fitReason: string } {
  const text = `${issue.title}\n${issue.body ?? ""}`;
  const textLower = text.toLowerCase();
  const labelsLower = issue.labels.map((l) => l.toLowerCase());
  const hasDocsLabel = labelsLower.some(
    (l) => l === "documentation" || l === "docs",
  );
  const mentionsMd = textLower.includes(".md");

  let score = 0;
  const reasonBits: string[] = [];

  for (const lang of languages) {
    const exts = LANG_EXTENSIONS[lang];
    if (!exts) continue;
    for (const ext of exts) {
      if (!textLower.includes(ext)) continue;
      const pathRe = new RegExp(
        `[\\w./-]+\\${ext.replace(".", "\\.")}`,
        "i",
      );
      const pathMatch = text.match(pathRe);
      score += 3;
      reasonBits.push(
        pathMatch
          ? `Mentions ${pathMatch[0]} and you write ${lang}.`
          : `Mentions ${ext} files and you write ${lang}.`,
      );
      break;
    }
  }

  if (hasDocsLabel || mentionsMd) {
    if (languages.length === 0) {
      score += 2;
      reasonBits.push(
        "Documentation issue — a solid first PR while you explore languages.",
      );
    } else {
      score += 3;
      reasonBits.push("Documentation label — counts for every beginner.");
    }
  }

  if (issue.comments === 0) {
    score += 1;
    reasonBits.push("No comments yet, so it is still open ground.");
  } else {
    const penalty = Math.floor(issue.comments / 5);
    if (penalty > 0) {
      score -= penalty;
    }
  }

  const fitReason =
    reasonBits[0] ??
    "Open good first issue with nobody assigned.";

  return { score, fitReason };
}

const FALLBACK_OWNER = "nishal21";

/**
 * Resolve a forgiving repo field: owner/repo, GitHub URL, or bare name.
 * Bare name tries `username/repo`, then `nishal21/repo`.
 */
async function resolveMatchRepo(
  repoInput: string,
  username: string,
): Promise<{ owner: string; repo: string }> {
  const trimmed = repoInput.trim();
  if (!trimmed) {
    throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
  }

  if (/github\.com[/:]/i.test(trimmed) || trimmed.includes("/")) {
    let parsed: { owner: string; repo: string };
    try {
      parsed = parseRepo(trimmed);
    } catch (err) {
      if (err instanceof GitHubError) throw err;
      throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
    }
    try {
      await getRepo(parsed.owner, parsed.repo);
      return parsed;
    } catch (err) {
      if (err instanceof GitHubError && err.code === "not_found") {
        throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
      }
      throw err;
    }
  }

  const bare = parseRepo(trimmed, { defaultOwner: username });
  try {
    await getRepo(bare.owner, bare.repo);
    return bare;
  } catch (err) {
    if (!(err instanceof GitHubError) || err.code !== "not_found") throw err;
  }

  if (username.toLowerCase() !== FALLBACK_OWNER) {
    try {
      await getRepo(FALLBACK_OWNER, bare.repo);
      return { owner: FALLBACK_OWNER, repo: bare.repo };
    } catch (err) {
      if (!(err instanceof GitHubError) || err.code !== "not_found") throw err;
    }
  }

  throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
}

function difficultyRank(level: DifficultyLevel): number {
  if (level === "easy") return 2;
  if (level === "medium") return 1;
  return 0;
}

/**
 * Match a beginner to open good-first issues, with difficulty filtering.
 */
export async function matchIssues(opts: {
  username: string;
  repo?: string;
}): Promise<MatchResult> {
  const username = opts.username.trim();
  let languages: string[] = [];
  try {
    languages = await getUserLanguages(username);
  } catch {
    languages = [];
  }

  const repoInput =
    opts.repo === undefined ? env.DEMO_REPO : opts.repo.trim();

  let candidates: Array<GoodFirstIssue & { owner: string; repo: string }> = [];

  if (repoInput) {
    const { owner, repo } = await resolveMatchRepo(repoInput, username);
    try {
      const list = await listGoodFirstIssues(owner, repo);
      candidates = list.map((issue) => withRepo(issue, owner, repo));
    } catch (err) {
      if (err instanceof GitHubError && err.code === "not_found") {
        throw new GitHubError(REPO_NOT_FOUND_MSG, "not_found");
      }
      throw err;
    }
  } else {
    const found = await searchGoodFirstIssues(languages, 20);
    candidates = found.flatMap((issue) => {
      const parsed = parseOwnerRepoFromIssueUrl(issue.htmlUrl);
      if (!parsed) return [];
      return [withRepo(issue, parsed.owner, parsed.repo)];
    });
  }

  const skipped: SkippedIssue[] = [];
  const open: Array<GoodFirstIssue & { owner: string; repo: string }> = [];

  for (const issue of candidates) {
    if (issue.assignees.length > 0) {
      skipped.push({
        ...issue,
        reason: `Assigned to @${issue.assignees[0]}`,
      });
      continue;
    }
    if (isOlderThanOneYear(issue.createdAt)) {
      skipped.push({
        ...issue,
        reason: "Older than 1 year",
      });
      continue;
    }
    open.push(issue);
  }

  // Linked open PR check (timeline) — only for survivors
  const linkedFlags = await Promise.all(
    open.map((issue) =>
      issueHasOpenLinkedPr(issue.owner, issue.repo, issue.number),
    ),
  );
  const afterLinked: typeof open = [];
  for (let i = 0; i < open.length; i++) {
    if (linkedFlags[i]) {
      skipped.push({
        ...open[i],
        reason: "Has a linked open pull request",
      });
    } else {
      afterLinked.push(open[i]);
    }
  }

  // Difficulty — prefer easy; show medium as Stretch; hide hard
  const difficultyRows = await Promise.all(
    afterLinked.map(async (issue) => {
      const { score, fitReason } = scoreIssue(issue, languages);
      const difficulty = await assessDifficulty({
        title: issue.title,
        body: issue.body,
        cacheKey: `diff:${issue.owner}/${issue.repo}#${issue.number}`,
      });
      return { issue, score, fitReason, difficulty };
    }),
  );

  const scored: ScoredIssue[] = [];
  for (const row of difficultyRows) {
    if (row.difficulty.level === "hard") {
      skipped.push({
        ...row.issue,
        reason: `Too hard for a first PR: ${row.difficulty.reason}`,
      });
      continue;
    }
    const boost = row.difficulty.level === "easy" ? 10 : 0;
    scored.push({
      ...row.issue,
      score: row.score + boost,
      fitReason: row.fitReason,
      difficulty: row.difficulty.level,
      difficultyReason: row.difficulty.reason,
      difficultyBadge: difficultyBadgeLabel(row.difficulty.level),
    });
  }

  scored.sort((a, b) => {
    const dr = difficultyRank(b.difficulty) - difficultyRank(a.difficulty);
    if (dr !== 0) return dr;
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  // Claim check on the issues we might show. Linked PRs and assignees
  // were already filtered; this catches "I'll take it" comments.
  const head = scored.slice(0, 5);
  const tail = scored.slice(5);
  const checked = await Promise.all(
    head.map(async (issue) => {
      try {
        const availability = await inspectIssueAvailability(
          issue.owner,
          issue.repo,
          issue.number,
        );
        return { issue, availability };
      } catch {
        return { issue, availability: null };
      }
    }),
  );

  const visible: ScoredIssue[] = [];
  for (const row of checked) {
    const availability = row.availability;
    if (
      availability &&
      (availability.status === "claimed" ||
        availability.status === "assigned" ||
        availability.status === "linked_pr" ||
        availability.status === "closed")
    ) {
      skipped.push({ ...row.issue, reason: availability.summary });
      continue;
    }
    visible.push(
      availability ? { ...row.issue, availability } : row.issue,
    );
  }

  const ranked = [...visible, ...tail];

  return {
    languages,
    picked: ranked[0] ?? null,
    others: ranked.slice(1),
    skipped,
  };
}
