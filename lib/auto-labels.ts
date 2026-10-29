/**
 * Fact-based PR labels for FirstPRbot.
 *
 * Every label here follows from data GitHub reports (file line counts,
 * file paths, GitHub's own closing-issue links, finished check runs and
 * statuses, author association). No model output and no guessing from prose.
 * When a fact is missing or unclear, the label is left off and the comment
 * says why. Pure functions only; the GitHub calls live in
 * `auto-labels-github.ts`.
 */

export const AUTO_LABEL_PREFIX = "firstpr/";

export type AutoLabelGroup = "size" | "area" | "linked-issue" | "checks" | "first-time";

export const AUTO_LABEL_GROUPS: readonly AutoLabelGroup[] = [
  "size",
  "area",
  "linked-issue",
  "checks",
  "first-time",
];

export type AutoLabelDef = {
  name: string;
  group: AutoLabelGroup;
  color: string;
  description: string;
};

export type SizeBucket = "XS" | "S" | "M" | "L" | "XL";

/** Upper bounds (exclusive) for each size; XL is everything from 500 up. */
export const SIZE_THRESHOLDS: readonly { size: SizeBucket; below: number }[] = [
  { size: "XS", below: 10 },
  { size: "S", below: 30 },
  { size: "M", below: 100 },
  { size: "L", below: 500 },
  { size: "XL", below: Infinity },
];

const L = (name: string) => `${AUTO_LABEL_PREFIX}${name}`;

export const AUTO_LABELS = {
  sizeXS: { name: L("size: XS"), group: "size", color: "c2e0c6", description: "Under 10 lines changed, lockfiles and generated files excluded" },
  sizeS: { name: L("size: S"), group: "size", color: "9be9a8", description: "10 to 29 lines changed, lockfiles and generated files excluded" },
  sizeM: { name: L("size: M"), group: "size", color: "fbca04", description: "30 to 99 lines changed, lockfiles and generated files excluded" },
  sizeL: { name: L("size: L"), group: "size", color: "f9a03f", description: "100 to 499 lines changed, lockfiles and generated files excluded" },
  sizeXL: { name: L("size: XL"), group: "size", color: "e11d21", description: "500 or more lines changed, lockfiles and generated files excluded" },
  docs: { name: L("docs only"), group: "area", color: "0075ca", description: "Every changed file is Markdown/reStructuredText/AsciiDoc or under docs/" },
  tests: { name: L("tests only"), group: "area", color: "bfd4f2", description: "Every changed file is a test file or under a test folder" },
  deps: { name: L("deps only"), group: "area", color: "0366d6", description: "Only package manifests and lockfiles changed, with at least one lockfile" },
  ci: { name: L("ci only"), group: "area", color: "5319e7", description: "Every changed file is under .github/workflows/" },
  linked: { name: L("linked issue"), group: "linked-issue", color: "0e8a16", description: "GitHub links this PR to an issue it will close" },
  noLinked: { name: L("no linked issue"), group: "linked-issue", color: "d93f0b", description: "GitHub shows no issue this PR will close" },
  checksPassing: { name: L("checks passing"), group: "checks", color: "2da44e", description: "Every finished check and status on the latest commit passed" },
  checksFailing: { name: L("checks failing"), group: "checks", color: "cf222e", description: "At least one finished check or status on the latest commit failed" },
  firstTime: { name: L("first-time contributor"), group: "first-time", color: "7057ff", description: "GitHub marks the author as a first-time contributor" },
} as const satisfies Record<string, AutoLabelDef>;

export const ALL_AUTO_LABELS: readonly AutoLabelDef[] = Object.values(AUTO_LABELS);

const SIZE_LABEL: Record<SizeBucket, AutoLabelDef> = {
  XS: AUTO_LABELS.sizeXS,
  S: AUTO_LABELS.sizeS,
  M: AUTO_LABELS.sizeM,
  L: AUTO_LABELS.sizeL,
  XL: AUTO_LABELS.sizeXL,
};

export function isAutoLabelName(name: string): boolean {
  const n = name.toLowerCase();
  return ALL_AUTO_LABELS.some((d) => d.name.toLowerCase() === n);
}

export function autoLabelDef(name: string): AutoLabelDef | undefined {
  const n = name.toLowerCase();
  return ALL_AUTO_LABELS.find((d) => d.name.toLowerCase() === n);
}

export function sizeBucket(lines: number): SizeBucket {
  return SIZE_THRESHOLDS.find((t) => lines < t.below)!.size;
}

// ---------------------------------------------------------------------------
// Path rules
// ---------------------------------------------------------------------------

function baseName(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

/** Lockfiles: written by package managers, never by hand. */
const LOCKFILES = new Set(
  [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lock",
    "bun.lockb",
    "deno.lock",
    "Cargo.lock",
    "Gemfile.lock",
    "poetry.lock",
    "Pipfile.lock",
    "uv.lock",
    "pdm.lock",
    "composer.lock",
    "go.sum",
    "go.work.sum",
    "mix.lock",
    "pubspec.lock",
    "Podfile.lock",
    "Package.resolved",
    "packages.lock.json",
    "gradle.lockfile",
    "flake.lock",
  ].map((n) => n.toLowerCase()),
);

/** Dependency manifests that sit next to those lockfiles. */
const MANIFESTS = new Set(
  [
    "package.json",
    "Cargo.toml",
    "go.mod",
    "go.work",
    "Gemfile",
    "Pipfile",
    "pyproject.toml",
    "composer.json",
    "pubspec.yaml",
    "Podfile",
    "Package.swift",
    "mix.exs",
    "deno.json",
    "flake.nix",
  ].map((n) => n.toLowerCase()),
);

export function isLockfile(path: string): boolean {
  return LOCKFILES.has(baseName(path).toLowerCase());
}

export function isManifest(path: string): boolean {
  const b = baseName(path).toLowerCase();
  return MANIFESTS.has(b) || /^requirements([-_.][\w.-]*)?\.txt$/.test(b);
}

const VENDORED_RE = /(^|\/)(vendor|node_modules)\//;
const GENERATED_RE =
  /\.min\.(js|css|mjs)$|\.(js|css|mjs)\.map$|(^|\/)__generated__\/|\.pb\.go$|_pb2(_grpc)?\.pyi?$|\.generated\.[a-z0-9]+$|\.g\.dart$/i;

export type SizeExclusion = "lockfile" | "vendored" | "generated";

/** Why a file is left out of the size count, or null if it counts. */
export function sizeExclusion(path: string): SizeExclusion | null {
  if (isLockfile(path)) return "lockfile";
  if (VENDORED_RE.test(path)) return "vendored";
  if (GENERATED_RE.test(path)) return "generated";
  return null;
}

const DOC_EXT_RE = /\.(md|mdx|markdown|rst|adoc|asciidoc)$/i;
const DOCS_DIR_RE = /^docs\//i;

export function isDocsPath(path: string): boolean {
  return DOC_EXT_RE.test(path) || DOCS_DIR_RE.test(path);
}

/**
 * Test files by folder or name. Deliberately narrow: `spec/` and `fixtures/`
 * folders are left out because some repos keep specifications or app data
 * there.
 */
const TEST_DIR_RE = /(^|\/)(test|tests|__tests__|testdata|__snapshots__)\//i;
const TEST_FILE_RE =
  /\.(test|spec)\.[a-z0-9]+$|_test\.(go|py|rs|exs|dart|c|cc|cpp)$|_spec\.rb$|(^|\/)test_[^/]+\.py$|(^|\/)conftest\.py$|\.snap$/i;

export function isTestPath(path: string): boolean {
  return TEST_DIR_RE.test(path) || TEST_FILE_RE.test(path);
}

export function isCiPath(path: string): boolean {
  return /^\.github\/workflows\/.+/.test(path);
}

// ---------------------------------------------------------------------------
// Facts
// ---------------------------------------------------------------------------

export type LabelFile = {
  filename: string;
  /** Old path for renamed files; both paths must match an area rule. */
  previousFilename?: string | null;
  additions: number;
  deletions: number;
};

export type ClosingIssue = { number: number; url: string; repo: string };

export type ClosingFact =
  | {
      ok: true;
      baseRef: string;
      defaultBranch: string;
      /** GitHub's closingIssuesReferences. */
      issues: ClosingIssue[];
      totalCount: number;
    }
  | { ok: false };

export type CheckRunFact = {
  name: string;
  status: string;
  conclusion: string | null;
};

export type StatusFact = { context: string; state: string };

export type SuiteFact = {
  app: string | null;
  status: string | null;
  conclusion: string | null;
  runCount: number;
};

export type ChecksFact =
  | { ok: true; runs: CheckRunFact[]; statuses: StatusFact[]; suites: SuiteFact[] }
  | { ok: false; reason: "no_access" | "error" };

export type LabelFacts = {
  owner: string;
  repo: string;
  number: number;
  prUrl: string;
  headSha: string;
  author: string | null;
  authorAssociation: string | null;
  body: string | null;
  files: LabelFile[];
  /** PR's changed_files count from GitHub; used to spot a truncated list. */
  changedFiles: number;
  closing: ClosingFact;
  checks: ChecksFact;
};

export type AutoLabel = { def: AutoLabelDef; evidence: string };
export type SkipNote = { group: AutoLabelGroup; note: string };
export type AutoLabelResult = { labels: AutoLabel[]; skipped: SkipNote[] };

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const code = (s: string) => `\`${s.replace(/`/g, "'")}\``;

function nameList(paths: string[], max = 3): string {
  const shown = paths.slice(0, max).map(code).join(", ");
  return paths.length > max ? `${shown} and ${paths.length - max} more` : shown;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function filesComplete(facts: LabelFacts): boolean {
  return facts.files.length > 0 && facts.files.length >= facts.changedFiles;
}

function sizeRule(facts: LabelFacts): AutoLabel | SkipNote {
  if (!filesComplete(facts)) {
    return {
      group: "size",
      note: `No size label: GitHub listed ${facts.files.length} of ${facts.changedFiles} changed files, so the line count isn't certain.`,
    };
  }
  const counted = facts.files.filter((f) => sizeExclusion(f.filename) === null);
  const excluded = facts.files.filter((f) => sizeExclusion(f.filename) !== null);
  if (counted.length === 0) {
    return {
      group: "size",
      note: `No size label: every changed file is a lockfile, vendored or generated (${nameList(excluded.map((f) => f.filename))}).`,
    };
  }
  const add = counted.reduce((s, f) => s + f.additions, 0);
  const del = counted.reduce((s, f) => s + f.deletions, 0);
  const lines = add + del;
  const def = SIZE_LABEL[sizeBucket(lines)];
  let evidence = `${plural(lines, "line")} changed (+${add} −${del}) in ${plural(counted.length, "file")}`;
  if (excluded.length > 0) {
    evidence += `, not counting ${nameList(excluded.map((f) => f.filename))}`;
  } else {
    evidence += `, no lockfiles or generated files in this PR`;
  }
  const zero = counted.filter((f) => f.additions + f.deletions === 0).length;
  if (zero > 0) {
    evidence += `; ${plural(zero, "file")} with no line changes (binary, rename or mode change)`;
  }
  return { def, evidence };
}

function areaRule(facts: LabelFacts): AutoLabel | null {
  if (!filesComplete(facts)) return null;
  const paths = (f: LabelFile) => [f.filename, ...(f.previousFilename ? [f.previousFilename] : [])];
  const all = (pred: (p: string) => boolean) => facts.files.every((f) => paths(f).every(pred));
  const n = facts.files.length;
  const files = plural(n, "changed file");

  if (all(isDocsPath)) {
    return { def: AUTO_LABELS.docs, evidence: `all ${files} are docs: ${nameList(facts.files.map((f) => f.filename))}` };
  }
  if (all(isTestPath)) {
    return { def: AUTO_LABELS.tests, evidence: `all ${files} are tests: ${nameList(facts.files.map((f) => f.filename))}` };
  }
  if (all(isCiPath)) {
    return { def: AUTO_LABELS.ci, evidence: `all ${files} are under ${code(".github/workflows/")}` };
  }
  if (all((p) => isLockfile(p) || isManifest(p)) && facts.files.some((f) => isLockfile(f.filename))) {
    return {
      def: AUTO_LABELS.deps,
      evidence: `only manifests and lockfiles changed: ${nameList(facts.files.map((f) => f.filename))}`,
    };
  }
  return null;
}

/** Any closing keyword pointing at an issue, in any repo. Used only to hold a label back. */
const CLOSING_MENTION_RE =
  /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b:?\s+(?:[\w.-]+\/[\w.-]+)?#\d+|\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b:?\s+https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+/i;

export function bodyMentionsClosing(body: string | null): boolean {
  if (!body) return false;
  // Ignore fenced and inline code, where GitHub doesn't link keywords either.
  const text = body.replace(/```[\s\S]*?```/g, " ").replace(/`[^`\n]*`/g, " ");
  return CLOSING_MENTION_RE.test(text);
}

function linkedIssueRule(facts: LabelFacts): AutoLabel | SkipNote {
  const c = facts.closing;
  if (!c.ok) {
    return { group: "linked-issue", note: "No linked-issue label: FirstPRbot couldn't read GitHub's linked issues for this PR." };
  }
  if (c.totalCount > 0 && c.issues.length > 0) {
    const here = `${facts.owner}/${facts.repo}`.toLowerCase();
    const refs = c.issues
      .slice(0, 3)
      .map((i) => `[${i.repo.toLowerCase() === here ? "" : i.repo}#${i.number}](${i.url})`)
      .join(", ");
    const more = c.totalCount > 3 ? ` and ${c.totalCount - 3} more` : "";
    return { def: AUTO_LABELS.linked, evidence: `GitHub will close ${refs}${more} when this PR merges` };
  }
  if (c.totalCount > 0) {
    return { group: "linked-issue", note: "No linked-issue label: GitHub reports a linked issue FirstPRbot can't see." };
  }
  if (c.baseRef !== c.defaultBranch) {
    return {
      group: "linked-issue",
      note: `No linked-issue label: this PR targets ${code(c.baseRef)}, not ${code(c.defaultBranch)}, and GitHub only links closing keywords on PRs to the default branch.`,
    };
  }
  if (bodyMentionsClosing(facts.body)) {
    return {
      group: "linked-issue",
      note: "No linked-issue label: the description has a closing keyword, but GitHub hasn't linked an issue to it.",
    };
  }
  return {
    def: AUTO_LABELS.noLinked,
    evidence: "GitHub shows no issue this PR will close (no `Fixes #N` and none linked in the sidebar)",
  };
}

const PASS = new Set(["success", "neutral", "skipped"]);
const FAIL = new Set(["failure", "timed_out", "startup_failure"]);

function checksRule(facts: LabelFacts): AutoLabel | SkipNote {
  const c = facts.checks;
  const sha = code(facts.headSha.slice(0, 7));
  const checksUrl = `${facts.prUrl}/checks`;
  if (!c.ok) {
    return {
      group: "checks",
      note:
        c.reason === "no_access"
          ? "No checks label: FirstPRbot can't read check runs on this repo yet."
          : "No checks label: FirstPRbot couldn't read check results for this commit.",
    };
  }

  const total = c.runs.length + c.statuses.length;
  const runningRuns = c.runs.filter((r) => r.status !== "completed");
  const runningStatuses = c.statuses.filter((s) => s.state === "pending");
  // A GitHub Actions suite with no runs yet is a workflow that hasn't started
  // (or waits for approval); its checks aren't in the list at all.
  const waitingSuites = c.suites.filter(
    (s) =>
      s.app === "github-actions" &&
      s.runCount === 0 &&
      (s.status !== "completed" || s.conclusion === "action_required"),
  );
  const running = runningRuns.length + runningStatuses.length;

  if (running > 0 || waitingSuites.length > 0) {
    const parts: string[] = [];
    if (running > 0) parts.push(`${running} of ${plural(total, "check")} still running on ${sha}`);
    if (waitingSuites.length > 0) {
      parts.push(`${plural(waitingSuites.length, "workflow")} waiting to start or for approval`);
    }
    return { group: "checks", note: `No checks label yet: ${parts.join(", ")}.` };
  }
  if (total === 0) {
    return { group: "checks", note: `No checks label: no checks have reported on ${sha}.` };
  }

  const failed = [
    ...c.runs.filter((r) => FAIL.has(r.conclusion ?? "")).map((r) => r.name),
    ...c.statuses.filter((s) => s.state === "failure" || s.state === "error").map((s) => s.context),
  ];
  if (failed.length > 0) {
    return {
      def: AUTO_LABELS.checksFailing,
      evidence: `${failed.length} of ${plural(total, "check")} failed on [${sha}](${checksUrl}): ${nameList(failed)}`,
    };
  }

  const unclear = [
    ...c.runs.filter((r) => !PASS.has(r.conclusion ?? "")).map((r) => `${r.name} (${r.conclusion ?? "no result"})`),
    ...c.statuses.filter((s) => s.state !== "success").map((s) => `${s.context} (${s.state})`),
  ];
  if (unclear.length > 0) {
    return {
      group: "checks",
      note: `No checks label: ${nameList(unclear)} on ${sha} neither passed nor failed.`,
    };
  }

  const skipped = c.runs.filter((r) => r.conclusion === "skipped" || r.conclusion === "neutral").length;
  const extra = skipped > 0 ? ` (${skipped} skipped or neutral)` : "";
  return {
    def: AUTO_LABELS.checksPassing,
    evidence: `${total} of ${plural(total, "check")} green on [${sha}](${checksUrl})${extra}`,
  };
}

function firstTimeRule(facts: LabelFacts): AutoLabel | null {
  // Code span, so the comment never @-mentions (and emails) the author.
  const who = facts.author ? code(`@${facts.author}`) : "the author";
  if (facts.authorAssociation === "FIRST_TIME_CONTRIBUTOR") {
    return { def: AUTO_LABELS.firstTime, evidence: `GitHub marks ${who} as a first-time contributor to this repo` };
  }
  if (facts.authorAssociation === "FIRST_TIMER") {
    return { def: AUTO_LABELS.firstTime, evidence: `GitHub marks ${who} as a first-time contributor on GitHub` };
  }
  return null;
}

function isLabel(x: AutoLabel | SkipNote | null): x is AutoLabel {
  return !!x && "def" in x;
}

/** Work out which bot labels the facts support. */
export function computeAutoLabels(
  facts: LabelFacts,
  groups: ReadonlySet<AutoLabelGroup>,
): AutoLabelResult {
  const out: AutoLabelResult = { labels: [], skipped: [] };
  const push = (x: AutoLabel | SkipNote | null) => {
    if (!x) return;
    if (isLabel(x)) out.labels.push(x);
    else out.skipped.push(x);
  };
  if (groups.has("size")) push(sizeRule(facts));
  if (groups.has("area")) push(areaRule(facts));
  if (groups.has("linked-issue")) push(linkedIssueRule(facts));
  if (groups.has("checks")) push(checksRule(facts));
  if (groups.has("first-time")) push(firstTimeRule(facts));
  return out;
}

// ---------------------------------------------------------------------------
// Sync plan
// ---------------------------------------------------------------------------

export type LabelEvent = {
  event: "labeled" | "unlabeled";
  label: string;
  /** True when FirstPRbot itself made the change. */
  byBot: boolean;
};

export type LabelPlan = {
  add: string[];
  remove: string[];
  /** Bot labels a person added or removed last; FirstPRbot leaves them be. */
  heldByMaintainer: string[];
};

/**
 * Decide what to add and remove. Only `firstpr/` labels are ever touched,
 * and only when FirstPRbot (or nobody) changed that label last.
 * `events` must be in timeline order.
 */
export function planLabelSync(input: {
  current: readonly string[];
  desired: readonly string[];
  events: readonly LabelEvent[];
}): LabelPlan {
  const lower = (s: string) => s.toLowerCase();
  const current = new Set(input.current.map(lower));
  const desired = new Set(input.desired.map(lower));
  const last = new Map<string, LabelEvent>();
  for (const e of input.events) last.set(lower(e.label), e);

  const plan: LabelPlan = { add: [], remove: [], heldByMaintainer: [] };
  for (const def of ALL_AUTO_LABELS) {
    const key = lower(def.name);
    const ev = last.get(key);
    const has = current.has(key);
    const want = desired.has(key);
    if (ev && !ev.byBot) {
      if (has !== want) plan.heldByMaintainer.push(def.name);
      continue;
    }
    if (want && !has) plan.add.push(def.name);
    // Remove only what the bot itself put there.
    if (!want && has && ev?.event === "labeled" && ev.byBot) plan.remove.push(def.name);
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Comment block
// ---------------------------------------------------------------------------

export const LABELS_BLOCK_START = "<!-- firstprbot:labels -->";
export const LABELS_BLOCK_END = "<!-- /firstprbot:labels -->";

export type LabelSyncOutcome =
  | { status: "applied"; plan: LabelPlan }
  /** Labels couldn't be written (no access, or GitHub refused). */
  | { status: "failed" };

function clean(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/<!--|-->/g, "");
}

/**
 * The "Labels" section of the bot comment. With nothing to say it is just
 * the two markers, so a later check refresh still knows where to write.
 */
export function formatLabelsBlock(result: AutoLabelResult, outcome: LabelSyncOutcome): string[] {
  const held0 = outcome.status === "applied" ? outcome.plan.heldByMaintainer : [];
  if (result.labels.length === 0 && result.skipped.length === 0 && held0.length === 0) {
    return [LABELS_BLOCK_START, LABELS_BLOCK_END];
  }
  const held = outcome.status === "applied" ? outcome.plan.heldByMaintainer.map((n) => n.toLowerCase()) : [];
  const lines: string[] = [LABELS_BLOCK_START, "#### Labels", ""];
  if (outcome.status === "failed") {
    lines.push("_FirstPRbot couldn't update labels on this repo, so the labels below may not be on the PR._", "");
  }
  for (const l of result.labels) {
    const heldNote = held.includes(l.def.name.toLowerCase()) ? " (a maintainer removed this label, so it stays off)" : "";
    lines.push(`- ${code(l.def.name)}: ${clean(l.evidence)}${heldNote}`);
  }
  const desired = new Set(result.labels.map((l) => l.def.name.toLowerCase()));
  for (const name of held.filter((n) => !desired.has(n))) {
    const def = autoLabelDef(name);
    if (def) lines.push(`- ${code(def.name)}: added by a maintainer, left as is`);
  }
  for (const s of result.skipped) lines.push(`- ${clean(s.note)}`);
  lines.push("", LABELS_BLOCK_END);
  return lines;
}

/** Swap the Labels section inside an existing comment body. Null if it has none. */
export function replaceLabelsBlock(body: string, block: string[]): string | null {
  const start = body.indexOf(LABELS_BLOCK_START);
  const end = body.indexOf(LABELS_BLOCK_END);
  if (start === -1 || end === -1 || end < start) return null;
  return body.slice(0, start) + block.join("\n") + body.slice(end + LABELS_BLOCK_END.length);
}
