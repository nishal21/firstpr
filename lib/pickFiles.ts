import { getTree } from "@/lib/github";
import { generateJson } from "@/lib/llm";
import { firstPassPickSchema } from "@/lib/schemas";

export type PickFilesIssue = {
  title: string;
  body: string | null;
};

export type PickedFile = {
  path: string;
  focusLine: number | null;
  why: string;
};

export type PickFilesArgs = {
  owner: string;
  repo: string;
  sha: string;
  issue: PickFilesIssue;
};

const MAX_TREE_FOR_AI = 400;
const MAX_PICKS = 3;

/** Path-like tokens: src/main.ts, CONTRIBUTING.md, path/to/file.ext */
const PATH_TOKEN_RE =
  /(?:^|[\s`"'([<{])((?:[\w.-]+\/)+[\w.-]+\.\w+|[\w.-]+\.(?:ts|tsx|js|jsx|mjs|cjs|rs|py|go|java|kt|md|json|toml|yml|yaml|css|html|vue|svelte|sh|bash))(?=$|[\s`"'|)\]>}.,;:!?\n])/gi;

const LINE_NEAR_RE =
  /(?:around\s+)?lines?\s+(\d+)(?:\s*[–—-]\s*(\d+))?|~(\d+)/gi;

function issueText(issue: PickFilesIssue): string {
  return `${issue.title}\n${issue.body ?? ""}`;
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

/**
 * Resolve a raw mention to a tree path if it exists.
 */
function resolveToTreePath(mention: string, treeSet: Set<string>): string | null {
  const cleaned = mention.replace(/^\/+/, "").trim();
  if (!cleaned) return null;
  if (treeSet.has(cleaned)) return cleaned;

  // Case-insensitive exact
  const lower = cleaned.toLowerCase();
  for (const p of treeSet) {
    if (p.toLowerCase() === lower) return p;
  }

  // Basename / suffix match when unique enough
  const hits = [...treeSet].filter(
    (p) =>
      p === cleaned ||
      p.endsWith(`/${cleaned}`) ||
      basename(p).toLowerCase() === lower,
  );
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) {
    const exactBase = hits.find((p) => basename(p) === cleaned);
    if (exactBase) return exactBase;
  }
  return null;
}

function findLineNearMention(
  text: string,
  mentionIndex: number,
  mentionLength: number,
): number | null {
  const windowStart = Math.max(0, mentionIndex - 120);
  const windowEnd = Math.min(
    text.length,
    mentionIndex + mentionLength + 120,
  );
  const nearby = text.slice(windowStart, windowEnd);

  LINE_NEAR_RE.lastIndex = 0;
  let best: number | null = null;
  let bestDist = Infinity;
  let m: RegExpExecArray | null;
  while ((m = LINE_NEAR_RE.exec(nearby)) !== null) {
    const line = Number(m[1] ?? m[3]);
    if (!Number.isFinite(line) || line < 1) continue;
    const absPos = windowStart + m.index;
    const dist = Math.abs(absPos - mentionIndex);
    if (dist < bestDist) {
      bestDist = dist;
      best = line;
    }
  }
  return best;
}

/**
 * Step A: regex issue text for real tree paths + nearby line refs.
 */
export function pickFilesFromIssueText(
  text: string,
  treePaths: string[],
): PickedFile[] {
  const treeSet = new Set(treePaths);
  const found = new Map<string, PickedFile>();

  // Backtick mentions first (high signal).
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const raw = m[1].trim();
    // Strip trailing punctuation / "line" clutter inside ticks if any
    const pathCandidate = raw.split(/[,:;]/)[0]?.trim() ?? raw;
    const path = resolveToTreePath(pathCandidate, treeSet);
    if (!path || found.has(path)) continue;
    const focusLine = findLineNearMention(text, m.index ?? 0, m[0].length);
    found.set(path, {
      path,
      focusLine,
      why:
        focusLine != null
          ? `Mentioned in the issue near line ${focusLine}`
          : "Mentioned in the issue",
    });
    if (found.size >= MAX_PICKS) return [...found.values()];
  }

  // Bare path tokens.
  PATH_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PATH_TOKEN_RE.exec(text)) !== null) {
    const path = resolveToTreePath(m[1], treeSet);
    if (!path || found.has(path)) continue;
    const focusLine = findLineNearMention(text, m.index, m[0].length);
    found.set(path, {
      path,
      focusLine,
      why:
        focusLine != null
          ? `Mentioned in the issue near line ${focusLine}`
          : "Mentioned in the issue",
    });
    if (found.size >= MAX_PICKS) break;
  }

  // Also: any tree path that appears as a literal substring (longer paths first).
  if (found.size < MAX_PICKS) {
    const sorted = [...treePaths].sort((a, b) => b.length - a.length);
    for (const path of sorted) {
      if (path.length < 5) continue;
      const idx = text.indexOf(path);
      if (idx < 0 || found.has(path)) continue;
      const focusLine = findLineNearMention(text, idx, path.length);
      found.set(path, {
        path,
        focusLine,
        why:
          focusLine != null
            ? `Mentioned in the issue near line ${focusLine}`
            : "Mentioned in the issue",
      });
      if (found.size >= MAX_PICKS) break;
    }
  }

  return [...found.values()].slice(0, MAX_PICKS);
}

const FIRST_PASS_SYSTEM = `You pick the most relevant source files for fixing a GitHub issue.
Return ONLY JSON like {"files":[{"path":"...","why":"..."}]} with at most 3 files.
Every path MUST be copied exactly from the provided file list.
why must be one short plain-English sentence.
No markdown, no code, no patches.`;

async function pickFilesWithAi(
  issue: PickFilesIssue,
  treePaths: string[],
): Promise<PickedFile[]> {
  const paths = treePaths.slice(0, MAX_TREE_FOR_AI);
  const user = [
    `Issue title: ${issue.title}`,
    `Issue body:`,
    issue.body || "(empty)",
    ``,
    `File list (${paths.length}):`,
    paths.join("\n"),
  ].join("\n");

  try {
    const result = await generateJson({
      task: "first_pass",
      system: FIRST_PASS_SYSTEM,
      user,
      schema: firstPassPickSchema,
      schemaName: "first_pass_pick_files",
      effort: "low",
    });

    const allowed = new Set(treePaths);
    const out: PickedFile[] = [];
    const seen = new Set<string>();
    for (const row of result.files) {
      if (!allowed.has(row.path) || seen.has(row.path)) continue;
      seen.add(row.path);
      out.push({
        path: row.path,
        focusLine: null,
        why: row.why.trim() || "Suggested by first-pass model",
      });
      if (out.length >= MAX_PICKS) break;
    }
    return out;
  } catch (err) {
    console.warn(
      "[pickFiles] first_pass AI failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/**
 * Pick up to 3 files for an issue.
 * Step A (regex, no AI) first; Step B (generateJson first_pass) only if A found < 2.
 */
export async function pickFiles({
  owner,
  repo,
  sha,
  issue,
}: PickFilesArgs): Promise<PickedFile[]> {
  const tree = await getTree(owner, repo, sha);
  const text = issueText(issue);
  const stepA = pickFilesFromIssueText(text, tree);

  if (stepA.length >= 2) {
    return stepA.slice(0, MAX_PICKS);
  }

  const stepB = await pickFilesWithAi(issue, tree);
  const seen = new Set(stepA.map((p) => p.path));
  const merged = [...stepA];
  for (const row of stepB) {
    if (seen.has(row.path)) continue;
    seen.add(row.path);
    merged.push(row);
    if (merged.length >= MAX_PICKS) break;
  }
  return merged;
}
