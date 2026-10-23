import type { GoodFirstIssue, PullFile, PullRequestInfo } from "@/lib/github";

export type CheckStatus = "pass" | "warn" | "fail" | "na";

export type CheckResult = {
  id: string;
  label: string;
  status: CheckStatus;
  evidence: string;
};

/** PR-only checks skipped when reviewing a pasted diff. */
export const PR_ONLY_CHECK_IDS = [
  "linked_issue",
  "branch_name",
  "description",
  "check_evidence",
] as const;

export type RunChecksArgs = {
  pr: PullRequestInfo | null;
  files: PullFile[];
  contributing: string | null;
  linkedIssue: GoodFirstIssue | null;
  /** When true, PR-only checks are N/A (excluded from score). */
  pastedDiff?: boolean;
  /**
   * Paths from the repo tree (or known root markers). Used to filter / infer
   * check commands so we never ask for a tool the repo does not use.
   */
  repoPaths?: string[];
};

const NA_PR_ONLY = "Only checked on a PR link";

const KNOWN_CHECK_COMMANDS = [
  "cargo test",
  "cargo clippy",
  "npm run build",
  "npm run build:wasm",
  "npm test",
  "npm run test",
  "pnpm test",
  "yarn test",
  "pytest",
  "go test",
] as const;

type RepoTool = "cargo" | "npm" | "pnpm" | "yarn" | "pytest" | "go";

const BRANCH_PREFIX_RE =
  /\b(fix|docs|doc|test|tests|feature|feat|chore|refactor|bugfix)\/(?:<[^>]+>|[\w.-]+)?/gi;

function check(
  id: string,
  label: string,
  status: CheckStatus,
  evidence: string,
): CheckResult {
  return { id, label, status, evidence };
}

function hasPath(paths: string[], pattern: RegExp): boolean {
  return paths.some((p) => pattern.test(p.replace(/\\/g, "/")));
}

/** Which package/test tools the tree (or PR paths) suggest are in use. */
export function detectRepoTools(repoPaths: string[]): Set<RepoTool> {
  const tools = new Set<RepoTool>();
  if (hasPath(repoPaths, /(^|\/)Cargo\.toml$/)) tools.add("cargo");
  if (hasPath(repoPaths, /(^|\/)package\.json$/)) tools.add("npm");
  if (
    hasPath(repoPaths, /(^|\/)pnpm-lock\.yaml$/) ||
    hasPath(repoPaths, /(^|\/)pnpm-workspace\.yaml$/)
  ) {
    tools.add("pnpm");
  }
  if (hasPath(repoPaths, /(^|\/)yarn\.lock$/)) tools.add("yarn");
  if (
    hasPath(repoPaths, /(^|\/)pyproject\.toml$/) ||
    hasPath(repoPaths, /(^|\/)requirements\.txt$/) ||
    hasPath(repoPaths, /(^|\/)setup\.py$/) ||
    hasPath(repoPaths, /(^|\/)Pipfile$/)
  ) {
    tools.add("pytest");
  }
  if (hasPath(repoPaths, /(^|\/)go\.mod$/)) tools.add("go");
  return tools;
}

function toolForCommand(cmd: string): RepoTool | null {
  const c = cmd.toLowerCase();
  if (c.startsWith("cargo ")) return "cargo";
  if (c.startsWith("pnpm ")) return "pnpm";
  if (c.startsWith("yarn ")) return "yarn";
  if (c.startsWith("npm ")) return "npm";
  if (c === "pytest" || c.startsWith("pytest ")) return "pytest";
  if (c.startsWith("go ")) return "go";
  return null;
}

function commandAllowedForRepo(cmd: string, tools: Set<RepoTool>): boolean {
  if (tools.size === 0) return true; // no markers → don't strip CONTRIBUTING cmds
  const tool = toolForCommand(cmd);
  if (!tool) return false;
  if (tool === "npm") return tools.has("npm") || tools.has("pnpm") || tools.has("yarn");
  if (tool === "pnpm") return tools.has("pnpm") || tools.has("npm");
  if (tool === "yarn") return tools.has("yarn") || tools.has("npm");
  return tools.has(tool);
}

/** Fallback when CONTRIBUTING has no usable check commands. */
export function inferCheckCommands(repoPaths: string[]): string[] {
  const tools = detectRepoTools(repoPaths);
  const cmds: string[] = [];
  if (tools.has("cargo")) cmds.push("cargo test");
  if (tools.has("npm") || tools.has("pnpm") || tools.has("yarn")) {
    cmds.push("npm run build");
  }
  if (tools.has("pytest")) cmds.push("pytest");
  if (tools.has("go")) cmds.push("go test");
  return cmds;
}

function extractCodeBlockCommands(md: string): string[] {
  const blocks = [...md.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const found = new Set<string>();
  for (const block of blocks) {
    for (const line of block.split(/\r?\n/)) {
      const trimmed = line.trim().replace(/^\$\s*/, "");
      if (!trimmed || trimmed.startsWith("#")) continue;
      for (const cmd of KNOWN_CHECK_COMMANDS) {
        if (trimmed.toLowerCase().includes(cmd.toLowerCase())) {
          found.add(cmd);
        }
      }
      // Preserve exact npm script when present (e.g. build:wasm)
      const npmRun = trimmed.match(/^npm\s+run\s+([\w:-]+)/i);
      if (npmRun) {
        const script = npmRun[1].toLowerCase();
        if (script === "build" || script === "build:wasm" || script === "test") {
          found.add(`npm run ${npmRun[1]}`);
        }
      }
      if (/^cargo\s+test\b/i.test(trimmed)) found.add("cargo test");
      if (/^cargo\s+clippy\b/i.test(trimmed)) found.add("cargo clippy");
      if (/^npm\s+test\b/i.test(trimmed)) found.add("npm test");
      if (/^pytest\b/i.test(trimmed)) found.add("pytest");
      if (/^go\s+test\b/i.test(trimmed)) found.add("go test");
      if (/^pnpm\s+test\b/i.test(trimmed)) found.add("pnpm test");
      if (/^yarn\s+test\b/i.test(trimmed)) found.add("yarn test");
    }
  }
  return [...found];
}

/**
 * Expected check commands: CONTRIBUTING.md only, filtered to tools the repo
 * uses; if none, infer from marker files (Cargo.toml → cargo test, etc.).
 */
export function expectedCheckCommands(
  contributing: string | null,
  repoPaths: string[] = [],
): string[] {
  const tools = detectRepoTools(repoPaths);
  const fromMd = contributing ? extractCodeBlockCommands(contributing) : [];
  const filtered = fromMd.filter((cmd) => commandAllowedForRepo(cmd, tools));

  if (filtered.length > 0) return filtered;
  if (fromMd.length > 0 && tools.size === 0) return fromMd;

  return inferCheckCommands(repoPaths);
}

function extractBranchPrefixes(md: string): string[] {
  const found = new Set<string>();
  for (const m of md.matchAll(BRANCH_PREFIX_RE)) {
    found.add(`${m[1].toLowerCase()}/`);
  }
  // Explicit backtick forms: `fix/<short-name>`
  for (const m of md.matchAll(
    /`(fix|docs|doc|test|tests|feature|feat)\/[^`]+`/gi,
  )) {
    found.add(`${m[1].toLowerCase()}/`);
  }
  return [...found];
}

function extractForbiddenPatterns(md: string): string[] {
  const lines = md.split(/\r?\n/);
  let inSection = false;
  const patterns: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      /^#{1,3}\s+.*(never\s+(stage|commit|belong)|what\s+never|do\s+not\s+commit)/i.test(
        line,
      ) ||
      /never\s+stage|never\s+commit|do\s+\*\*not\*\*\s+`?git add/i.test(line)
    ) {
      inSection = true;
      continue;
    }
    if (inSection && /^#{1,3}\s+/.test(line)) {
      inSection = false;
    }
    if (!inSection) continue;

    // Bullets: - `browser-droid/`, - `*.zImage`
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const p = m[1].trim();
      if (p.length >= 2 && !/\s/.test(p)) patterns.push(p);
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (bullet) {
      const raw = bullet[1].replace(/\*\*/g, "").trim();
      const token = raw.split(/\s+/)[0]?.replace(/[.,;:]$/, "");
      if (token && /^[\w.*/-]+$/.test(token) && token.length >= 2) {
        patterns.push(token);
      }
    }
  }

  return [...new Set(patterns)];
}

function matchesForbidden(path: string, pattern: string): boolean {
  const p = pattern.replace(/^\.\//, "");
  if (p.startsWith("*.")) {
    const ext = p.slice(1); // .zImage
    return path.endsWith(ext) || path.toLowerCase().endsWith(ext.toLowerCase());
  }
  if (p.endsWith("/")) {
    return path === p.slice(0, -1) || path.startsWith(p);
  }
  if (p.includes("*")) {
    const re = new RegExp(
      "^" +
        p
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*/g, ".*") +
        "$",
      "i",
    );
    return re.test(path);
  }
  return path === p || path.startsWith(`${p}/`) || path.startsWith(p);
}

function isTestFile(path: string): boolean {
  const lower = path.toLowerCase();
  if (
    /(^|\/)(tests?|__tests__)(\/|$)/.test(lower) ||
    /_test\./.test(lower) ||
    /\.tests?\./.test(lower) ||
    /\.spec\./.test(lower) ||
    /\/tests\.rs$/.test(lower) ||
    /_tests?\.rs$/.test(lower)
  ) {
    return true;
  }
  return false;
}

function isDocsFile(path: string): boolean {
  return /\.md$/i.test(path) || /(^|\/)docs?\//i.test(path);
}

function pathsMentionedInIssue(issue: GoodFirstIssue | null): string[] {
  if (!issue) return [];
  const text = `${issue.title}\n${issue.body ?? ""}`;
  const found = new Set<string>();
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (t.includes("/") || /\.\w+$/.test(t)) found.add(t);
  }
  for (const m of text.matchAll(/\b[\w.-]+(?:\/[\w.-]+)+\.\w+\b/g)) {
    found.add(m[0]);
  }
  return [...found];
}

function fileOutsideIssuePaths(files: PullFile[], mentioned: string[]): boolean {
  if (mentioned.length === 0) return false;
  for (const f of files) {
    const ok = mentioned.some(
      (m) =>
        f.filename === m ||
        f.filename.startsWith(m.replace(/\/$/, "") + "/") ||
        f.filename.endsWith(`/${m}`) ||
        f.filename.includes(m),
    );
    if (!ok && !isDocsFile(f.filename)) return true;
  }
  return false;
}

function checkLinkedIssue(
  pr: PullRequestInfo | null,
  linkedIssue: GoodFirstIssue | null,
  pastedDiff: boolean,
): CheckResult {
  const id = "linked_issue";
  const label = "Linked issue";
  if (pastedDiff || !pr) {
    return check(id, label, "na", NA_PR_ONLY);
  }
  if (pr.linkedIssueNumbers.length === 0) {
    return check(
      id,
      label,
      "fail",
      "No 'Fixes #N' in the description",
    );
  }
  if (!linkedIssue) {
    return check(
      id,
      label,
      "fail",
      `Linked #${pr.linkedIssueNumbers[0]} could not be loaded`,
    );
  }
  if (linkedIssue.state === "open" || linkedIssue.state === "closed") {
    // Closed is OK when linked via Fixes (closed by this PR or already done).
    return check(
      id,
      label,
      "pass",
      `Linked #${linkedIssue.number} “${linkedIssue.title}” (${linkedIssue.state})`,
    );
  }
  return check(id, label, "fail", `Issue #${linkedIssue.number} is not usable`);
}

function checkBranchName(
  pr: PullRequestInfo | null,
  contributing: string | null,
  pastedDiff: boolean,
): CheckResult {
  const id = "branch_name";
  const label = "Branch name";
  if (pastedDiff || !pr) return check(id, label, "na", NA_PR_ONLY);

  if (!contributing?.trim()) {
    return check(id, label, "pass", "No branch rule in CONTRIBUTING.md");
  }
  const prefixes = extractBranchPrefixes(contributing);
  if (prefixes.length === 0) {
    return check(id, label, "pass", "No branch rule in CONTRIBUTING.md");
  }
  const head = pr.headRef.toLowerCase();
  const ok = prefixes.some((p) => head.startsWith(p));
  if (ok) {
    return check(
      id,
      label,
      "pass",
      `Branch \`${pr.headRef}\` matches ${prefixes.join(", ")}`,
    );
  }
  return check(
    id,
    label,
    "warn",
    `Branch \`${pr.headRef}\` should start with ${prefixes.join(" or ")}`,
  );
}

function checkDescription(
  pr: PullRequestInfo | null,
  pastedDiff: boolean,
): CheckResult {
  const id = "description";
  const label = "PR description";
  if (pastedDiff || !pr) return check(id, label, "na", NA_PR_ONLY);
  const body = (pr.body ?? "").trim();
  if (!body) return check(id, label, "fail", "Description is empty");
  if (body.length < 80) {
    return check(
      id,
      label,
      "warn",
      `Description is only ${body.length} characters (aim for 80+)`,
    );
  }
  return check(id, label, "pass", `Description is ${body.length} characters`);
}

function checkEvidence(
  pr: PullRequestInfo | null,
  contributing: string | null,
  pastedDiff: boolean,
  repoPaths: string[] = [],
): CheckResult {
  const id = "check_evidence";
  const label = "Check evidence";
  if (pastedDiff || !pr) return check(id, label, "na", NA_PR_ONLY);

  const commands = expectedCheckCommands(contributing, repoPaths);
  if (commands.length === 0) {
    return check(
      id,
      label,
      "pass",
      "No check commands listed in CONTRIBUTING.md",
    );
  }

  const body = (pr.body ?? "").toLowerCase();
  const mentionsCmd = commands.some((c) => body.includes(c.toLowerCase()));

  // Only treat as output evidence if it matches a tool we actually expect.
  const expectCargo = commands.some((c) => c.startsWith("cargo "));
  const expectNpm = commands.some(
    (c) => c.startsWith("npm ") || c.startsWith("pnpm ") || c.startsWith("yarn "),
  );
  const expectPytest = commands.some((c) => c.startsWith("pytest"));
  const expectGo = commands.some((c) => c.startsWith("go "));
  const outputParts: string[] = [
    "test result:",
    "tests?\\s+passed",
    "build succeeded",
    "all tests",
    "✓",
    "✔",
  ];
  if (expectCargo) outputParts.push("cargo test", "cargo clippy");
  if (expectNpm) outputParts.push("npm run build", "npm test", "built in");
  if (expectPytest) outputParts.push("pytest", "passed in");
  if (expectGo) outputParts.push("go test", "\\bPASS\\b");
  const looksLikeOutput = new RegExp(outputParts.join("|"), "i").test(
    pr.body ?? "",
  );

  if (mentionsCmd || looksLikeOutput) {
    return check(
      id,
      label,
      "pass",
      "PR body mentions a check command or looks like test/build output",
    );
  }
  return check(
    id,
    label,
    "warn",
    `Expected evidence of: ${commands.join(", ")}`,
  );
}

/** Added (+) lines that look like inline / colocated tests. */
const INLINE_TEST_ADDED_RE =
  /#\[cfg\(test\)\]|#\[test\]|\bmod tests\b|\bdescribe\(|\bit\(|\btest\(|\bdef test_/;

function fileWithInlineTests(files: PullFile[]): string | null {
  for (const f of files) {
    if (!f.patch) continue;
    for (const line of f.patch.split(/\r?\n/)) {
      if (!line.startsWith("+") || line.startsWith("+++")) continue;
      if (INLINE_TEST_ADDED_RE.test(line)) return f.filename;
    }
  }
  return null;
}

function checkTestsTouched(
  files: PullFile[],
  linkedIssue: GoodFirstIssue | null,
): CheckResult {
  const id = "tests_touched";
  const label = "Tests touched";

  if (files.length > 0 && files.every((f) => isDocsFile(f.filename))) {
    return check(id, label, "pass", "Docs-only PR");
  }

  const touched = files.some((f) => isTestFile(f.filename));
  if (touched) {
    return check(id, label, "pass", "Test files were changed");
  }

  const inlineFile = fileWithInlineTests(files);
  if (inlineFile) {
    return check(id, label, "pass", `Inline tests added in ${inlineFile}`);
  }

  const wantsTests =
    linkedIssue?.labels.some((l) => l.toLowerCase() === "tests") ?? false;
  if (wantsTests) {
    return check(
      id,
      label,
      "fail",
      'Issue has label "tests" but no test files were changed',
    );
  }

  return check(
    id,
    label,
    "warn",
    "No test files changed (fine for docs changes)",
  );
}

function checkScope(
  pr: PullRequestInfo | null,
  files: PullFile[],
  linkedIssue: GoodFirstIssue | null,
  pastedDiff: boolean,
): CheckResult {
  const id = "scope";
  const label = "Scope";

  const changedFiles = pr?.changedFiles ?? files.length;
  const additions =
    pr?.additions ?? files.reduce((s, f) => s + f.additions, 0);
  const deletions =
    pr?.deletions ?? files.reduce((s, f) => s + f.deletions, 0);

  const reasons: string[] = [];
  if (changedFiles > 5) reasons.push(`${changedFiles} files changed`);
  if (additions + deletions > 300) {
    reasons.push(`${additions + deletions} lines changed`);
  }

  const mentioned = pathsMentionedInIssue(linkedIssue);
  if (fileOutsideIssuePaths(files, mentioned)) {
    reasons.push("files outside paths named in the issue");
  }

  if (reasons.length > 0) {
    return check(id, label, "warn", reasons.join("; "));
  }

  if (pastedDiff && !pr) {
    return check(
      id,
      label,
      "pass",
      `${files.length} file(s) in pasted diff look focused`,
    );
  }

  return check(
    id,
    label,
    "pass",
    `${changedFiles} file(s), ${additions + deletions} lines`,
  );
}

function checkForbiddenFiles(
  files: PullFile[],
  contributing: string | null,
): CheckResult {
  const id = "forbidden_files";
  const label = "Forbidden files";

  if (!contributing?.trim()) {
    return check(id, label, "pass", "No never-commit list in CONTRIBUTING.md");
  }

  const patterns = extractForbiddenPatterns(contributing);
  if (patterns.length === 0) {
    return check(id, label, "pass", "No never-commit list in CONTRIBUTING.md");
  }

  const hits: string[] = [];
  for (const f of files) {
    for (const pat of patterns) {
      if (matchesForbidden(f.filename, pat)) {
        hits.push(`${f.filename} (matched ${pat})`);
        break;
      }
    }
  }

  if (hits.length > 0) {
    return check(id, label, "fail", hits.slice(0, 5).join("; "));
  }
  return check(id, label, "pass", "No forbidden paths in the diff");
}

/**
 * Deterministic maintainer-ready checks (no AI).
 */
export function runChecks(args: RunChecksArgs): CheckResult[] {
  const pastedDiff = Boolean(args.pastedDiff);
  const { pr, files, contributing, linkedIssue } = args;
  // Prefer full tree; fall back to changed-file paths for marker detection.
  const repoPaths =
    args.repoPaths && args.repoPaths.length > 0
      ? args.repoPaths
      : files.map((f) => f.filename);

  return [
    checkLinkedIssue(pr, linkedIssue, pastedDiff),
    checkBranchName(pr, contributing, pastedDiff),
    checkDescription(pr, pastedDiff),
    checkEvidence(pr, contributing, pastedDiff, repoPaths),
    checkTestsTouched(files, linkedIssue),
    checkScope(pr, files, linkedIssue, pastedDiff),
    checkForbiddenFiles(files, contributing),
  ];
}

/** Split a unified diff into PullFile-like entries by `diff --git`. */
export function splitDiffIntoFiles(diff: string): PullFile[] {
  const chunks = diff.split(/(?=^diff --git )/m).filter((c) => c.trim());
  const files: PullFile[] = [];

  for (const chunk of chunks) {
    const header = chunk.match(/^diff --git a\/(.+?) b\/(.+)$/m);
    if (!header) continue;
    const filename = header[2].trim();
    const plus = (chunk.match(/^\+(?!\+\+)/gm) ?? []).length;
    const minus = (chunk.match(/^-(?!--)/gm) ?? []).length;
    files.push({
      filename,
      status: "modified",
      additions: plus,
      deletions: minus,
      patch: chunk.length > 8000 ? chunk.slice(0, 8000) : chunk,
    });
  }

  return files;
}
