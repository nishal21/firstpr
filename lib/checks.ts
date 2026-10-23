import type { GoodFirstIssue, PullFile, PullRequestInfo } from "@/lib/github";

export type CheckStatus = "pass" | "warn" | "fail";

export type CheckResult = {
  id: string;
  label: string;
  status: CheckStatus;
  evidence: string;
};

export type RunChecksArgs = {
  pr: PullRequestInfo | null;
  files: PullFile[];
  contributing: string | null;
  linkedIssue: GoodFirstIssue | null;
  /** When true, PR-only checks become warn ("Pasted diff, no PR details"). */
  pastedDiff?: boolean;
};

const PASTED = "Pasted diff, no PR details";

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
];

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
      // Also catch bare "cargo test --lib" style as cargo test
      if (/^cargo\s+test\b/i.test(trimmed)) found.add("cargo test");
      if (/^npm\s+run\s+build\b/i.test(trimmed)) found.add("npm run build");
      if (/^npm\s+test\b/i.test(trimmed)) found.add("npm test");
      if (/^pytest\b/i.test(trimmed)) found.add("pytest");
    }
  }
  return [...found];
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
    return check(id, label, "warn", PASTED);
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
  if (pastedDiff || !pr) return check(id, label, "warn", PASTED);

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
  if (pastedDiff || !pr) return check(id, label, "warn", PASTED);
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
): CheckResult {
  const id = "check_evidence";
  const label = "Check evidence";
  if (pastedDiff || !pr) return check(id, label, "warn", PASTED);

  const commands = contributing
    ? extractCodeBlockCommands(contributing)
    : [];
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
  const looksLikeOutput =
    /test result:|tests?\s+passed|passed\b|✓|✔|cargo test|npm run build|build succeeded|all tests/i.test(
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

  return [
    checkLinkedIssue(pr, linkedIssue, pastedDiff),
    checkBranchName(pr, contributing, pastedDiff),
    checkDescription(pr, pastedDiff),
    checkEvidence(pr, contributing, pastedDiff),
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
