import OpenAI from "openai";
import { getFile } from "@/lib/github";
import { generateJson } from "@/lib/llm";
import { pickFilesSchema } from "@/lib/schemas";

export type FilePickSource = "neysa" | "openai";

export type PickFilesResult = {
  files: string[];
  source: FilePickSource;
};

export type PickFilesRepo = {
  owner: string;
  repo: string;
  sha: string;
};

const PICK_SYSTEM = `You pick the most relevant source files for fixing a GitHub issue.
Return ONLY JSON like {"files":["path",...]} with at most 5 paths.
Every path MUST be copied exactly from the provided candidate list.
You are given each candidate's path and its first ~20 lines — use them.
No markdown, no code fences, no other text.`;

const NEYSA_TIMEOUT_MS = 10_000;
const MAX_CANDIDATES = 300;
const TOP_SCORED = 25;
const PREVIEW_LINES = 20;

const SKIP_DIRS = new Set(["node_modules", "target", "dist", ".git", "pkg"]);

const LOCK_FILE_RE =
  /(?:^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|Cargo\.lock|bun\.lockb|composer\.lock|Gemfile\.lock|poetry\.lock|Pipfile\.lock)$/i;

const BINARY_EXT_RE =
  /\.(png|jpe?g|gif|webp|ico|bmp|woff2?|ttf|eot|mp[34]|wav|ogg|zip|gz|tgz|tar|7z|rar|pdf|wasm|dll|exe|so|dylib|o|a|rlib|bin|class|jar|pyc|pyo|pack|idx|bcmap)$/i;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "have",
  "has",
  "are",
  "was",
  "were",
  "will",
  "can",
  "should",
  "would",
  "could",
  "about",
  "when",
  "where",
  "what",
  "which",
  "while",
  "than",
  "then",
  "them",
  "they",
  "their",
  "there",
  "been",
  "being",
  "also",
  "just",
  "like",
  "make",
  "made",
  "need",
  "needs",
  "using",
  "used",
  "use",
  "file",
  "files",
  "code",
  "issue",
  "please",
  "thanks",
  "add",
  "fix",
  "update",
  "change",
  "changes",
]);

type FilePreview = {
  path: string;
  preview: string;
};

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function basename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

function shouldDropPath(path: string): boolean {
  if (path.split("/").some((part) => SKIP_DIRS.has(part))) return true;
  if (LOCK_FILE_RE.test(path)) return true;
  if (BINARY_EXT_RE.test(path)) return true;
  return false;
}

function filterCandidatePaths(filePaths: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const path of filePaths) {
    if (shouldDropPath(path) || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

function extractBackticks(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
}

function extractMentionedPaths(text: string, known: Set<string>): string[] {
  const found = new Set<string>();
  for (const tick of extractBackticks(text)) {
    if (known.has(tick)) found.add(tick);
    else {
      const hit = [...known].find(
        (p) => p === tick || p.endsWith(`/${tick}`) || basename(p) === tick,
      );
      if (hit) found.add(hit);
    }
  }
  for (const match of text.matchAll(/\b[\w.-]+(?:\/[\w.-]+)+\.\w+\b/g)) {
    if (known.has(match[0])) found.add(match[0]);
  }
  return [...found];
}

function extractFunctionNames(text: string): string[] {
  const names = new Set<string>();
  for (const tick of extractBackticks(text)) {
    if (!tick.includes("/") && !tick.includes("\\") && /^[A-Za-z_][\w]*$/.test(tick)) {
      names.add(tick);
    }
  }
  // Bare fn-like tokens: snake_case or camelCase identifiers that look like APIs
  for (const match of text.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/g)) {
    names.add(match[1]);
  }
  for (const match of text.matchAll(/\b([a-z][a-zA-Z0-9]*(?:[A-Z][a-zA-Z0-9]+)+)\b/g)) {
    names.add(match[1]);
  }
  return [...names].filter((n) => n.length >= 3 && !STOP_WORDS.has(n.toLowerCase()));
}

function tokenizeIssue(text: string): string[] {
  const words =
    text
      .toLowerCase()
      .match(/[a-zA-Z_][\w-]{2,}/g)
      ?.filter((w) => !STOP_WORDS.has(w)) ?? [];
  return [...new Set(words)];
}

function scorePath(path: string, keywords: string[], mentionedPaths: Set<string>): number {
  let score = 0;
  const lower = path.toLowerCase();
  const base = basename(path).toLowerCase();
  const stem = base.replace(/\.[^.]+$/, "");

  if (mentionedPaths.has(path)) score += 100;

  for (const kw of keywords) {
    if (!kw) continue;
    if (stem === kw || base === kw) score += 12;
    else if (stem.includes(kw) || base.includes(kw)) score += 6;
    else if (lower.includes(kw)) score += 2;
  }

  return score;
}

function rankCandidates(
  filtered: string[],
  issueTitle: string,
  issueBody: string,
): { ranked: string[]; mustInclude: string[]; functionNames: string[] } {
  const known = new Set(filtered);
  const mentionedPaths = extractMentionedPaths(
    `${issueTitle}\n${issueBody}`,
    known,
  );
  const mentionedSet = new Set(mentionedPaths);
  const functionNames = extractFunctionNames(`${issueTitle}\n${issueBody}`);
  const keywords = [
    ...tokenizeIssue(`${issueTitle}\n${issueBody}`),
    ...functionNames.map((n) => n.toLowerCase()),
    ...extractBackticks(`${issueTitle}\n${issueBody}`).map((t) =>
      t.toLowerCase(),
    ),
  ];
  const uniqueKeywords = [...new Set(keywords)];

  const scored = filtered
    .map((path) => ({
      path,
      score: scorePath(path, uniqueKeywords, mentionedSet),
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const ranked: string[] = [];
  const seen = new Set<string>();

  for (const path of mentionedPaths) {
    if (seen.has(path)) continue;
    seen.add(path);
    ranked.push(path);
  }

  for (const row of scored) {
    if (seen.has(row.path)) continue;
    seen.add(row.path);
    ranked.push(row.path);
    if (ranked.length >= TOP_SCORED) break;
  }

  return { ranked, mustInclude: mentionedPaths, functionNames };
}

function previewContainsFunction(preview: string, name: string): boolean {
  const re = new RegExp(
    `\\b(?:fn\\s+|function\\s+|def\\s+|async\\s+fn\\s+)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
  );
  return re.test(preview);
}

async function fetchPreviews(
  repoCtx: PickFilesRepo,
  paths: string[],
): Promise<FilePreview[]> {
  const settled = await Promise.allSettled(
    paths.map(async (path) => {
      try {
        const text = await getFile(repoCtx.owner, repoCtx.repo, repoCtx.sha, path);
        const preview = text.split(/\r?\n/).slice(0, PREVIEW_LINES).join("\n");
        return { path, preview };
      } catch {
        return { path, preview: "" };
      }
    }),
  );

  return settled.map((result, i) =>
    result.status === "fulfilled"
      ? result.value
      : { path: paths[i], preview: "" },
  );
}

function applyFunctionMentions(
  previews: FilePreview[],
  functionNames: string[],
  mustInclude: Set<string>,
): void {
  for (const name of functionNames) {
    for (const item of previews) {
      if (previewContainsFunction(item.preview, name)) {
        mustInclude.add(item.path);
      }
    }
  }
}

function buildUserPrompt(
  issueTitle: string,
  issueBody: string,
  previews: FilePreview[],
): string {
  return [
    `Issue title: ${issueTitle}`,
    `Issue body:`,
    issueBody || "(empty)",
    ``,
    `Candidate files (${previews.length}) with first ~${PREVIEW_LINES} lines:`,
    ...previews.map(
      (p) =>
        `--- ${p.path} ---\n${p.preview || "(preview unavailable)"}`,
    ),
  ].join("\n");
}

function filterToKnownPaths(files: string[], allowedPaths: string[]): string[] {
  const allowed = new Set(allowedPaths);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of files) {
    if (!allowed.has(path) || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
    if (out.length >= 5) break;
  }
  return out;
}

function mergeMustInclude(
  picked: string[],
  mustInclude: string[],
  allowedPaths: string[],
): string[] {
  const allowed = new Set(allowedPaths);
  const out: string[] = [];
  const seen = new Set<string>();

  for (const path of mustInclude) {
    if (!allowed.has(path) || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  for (const path of picked) {
    if (!allowed.has(path) || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
    if (out.length >= 5) break;
  }
  return out.slice(0, 5);
}

async function pickWithOpenAI(
  issueTitle: string,
  issueBody: string,
  previews: FilePreview[],
  allowedPaths: string[],
  mustInclude: string[],
): Promise<string[]> {
  const result = await generateJson({
    // Not "first_pass" — that path may re-enter Neysa.
    task: "explain",
    system: PICK_SYSTEM,
    user: buildUserPrompt(issueTitle, issueBody, previews),
    schema: pickFilesSchema,
    schemaName: "pick_files",
    effort: "low",
  });
  return mergeMustInclude(
    filterToKnownPaths(result.files, allowedPaths),
    mustInclude,
    allowedPaths,
  );
}

async function pickWithNeysa(
  issueTitle: string,
  issueBody: string,
  previews: FilePreview[],
  allowedPaths: string[],
  mustInclude: string[],
): Promise<string[]> {
  const baseURL = process.env.NEYSA_BASE_URL;
  const apiKey = process.env.NEYSA_API_KEY;
  const model = process.env.NEYSA_MODEL;

  if (!apiKey) {
    throw new Error("NEYSA_API_KEY missing");
  }
  if (!baseURL || !model) {
    throw new Error("NEYSA_BASE_URL or NEYSA_MODEL missing");
  }

  const client = new OpenAI({ baseURL, apiKey });

  const completion = await client.chat.completions.create(
    {
      model,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        { role: "system", content: PICK_SYSTEM },
        {
          role: "user",
          content: buildUserPrompt(issueTitle, issueBody, previews),
        },
      ],
    },
    { signal: AbortSignal.timeout(NEYSA_TIMEOUT_MS) },
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Neysa returned empty content");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stripJsonFences(content));
  } catch {
    throw new Error("Neysa returned invalid JSON");
  }

  const parsed = pickFilesSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Neysa JSON failed schema: ${parsed.error.message}`);
  }

  return mergeMustInclude(
    filterToKnownPaths(parsed.data.files, allowedPaths),
    mustInclude,
    allowedPaths,
  );
}

async function prepareCandidates(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
  repoCtx: PickFilesRepo,
): Promise<{
  previews: FilePreview[];
  allowedPaths: string[];
  mustInclude: string[];
}> {
  const filtered = filterCandidatePaths(filePaths);
  const { ranked, mustInclude, functionNames } = rankCandidates(
    filtered,
    issueTitle,
    issueBody,
  );

  const previews = await fetchPreviews(repoCtx, ranked);
  const must = new Set(mustInclude);
  applyFunctionMentions(previews, functionNames, must);

  // Ensure must-include paths are present in the preview list sent to the model.
  const previewPaths = new Set(previews.map((p) => p.path));
  const missingMust = [...must].filter((p) => !previewPaths.has(p));
  if (missingMust.length > 0) {
    const extra = await fetchPreviews(repoCtx, missingMust);
    previews.unshift(...extra);
  }

  return {
    previews,
    allowedPaths: filtered,
    mustInclude: [...must],
  };
}

/**
 * Pick up to 5 relevant files for an issue.
 * Prefers Neysa (Gemma 4); falls back to OpenAI. Never throws to callers.
 */
export async function pickFiles(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
  repoCtx: PickFilesRepo,
): Promise<PickFilesResult> {
  if (filePaths.length === 0) {
    return { files: [], source: "openai" };
  }

  let prepared: {
    previews: FilePreview[];
    allowedPaths: string[];
    mustInclude: string[];
  };
  try {
    prepared = await prepareCandidates(issueTitle, issueBody, filePaths, repoCtx);
  } catch (err) {
    console.warn(
      "[neysa] pickFiles: candidate prep failed:",
      err instanceof Error ? err.message : err,
    );
    return { files: [], source: "openai" };
  }

  const { previews, allowedPaths, mustInclude } = prepared;
  if (previews.length === 0) {
    return { files: [], source: "openai" };
  }

  if (!process.env.NEYSA_API_KEY) {
    console.warn("[neysa] pickFiles: NEYSA_API_KEY missing; falling back to OpenAI");
    try {
      return {
        files: await pickWithOpenAI(
          issueTitle,
          issueBody,
          previews,
          allowedPaths,
          mustInclude,
        ),
        source: "openai",
      };
    } catch (err) {
      console.warn(
        "[neysa] pickFiles: OpenAI fallback failed:",
        err instanceof Error ? err.message : err,
      );
      return {
        files: mergeMustInclude([], mustInclude, allowedPaths),
        source: "openai",
      };
    }
  }

  try {
    const files = await pickWithNeysa(
      issueTitle,
      issueBody,
      previews,
      allowedPaths,
      mustInclude,
    );
    return { files, source: "neysa" };
  } catch (err) {
    const reason =
      err instanceof Error
        ? err.name === "TimeoutError" || /aborted|timeout/i.test(err.message)
          ? `timeout/error: ${err.message}`
          : err.message
        : String(err);
    console.warn(`[neysa] pickFiles failed (${reason}); falling back to OpenAI`);
    try {
      return {
        files: await pickWithOpenAI(
          issueTitle,
          issueBody,
          previews,
          allowedPaths,
          mustInclude,
        ),
        source: "openai",
      };
    } catch (fallbackErr) {
      console.warn(
        "[neysa] pickFiles: OpenAI fallback failed:",
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
      );
      return {
        files: mergeMustInclude([], mustInclude, allowedPaths),
        source: "openai",
      };
    }
  }
}
