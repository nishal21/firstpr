import { cached } from "@/lib/cache";
import {
  getContributing,
  getFile,
  getIssue,
  getRepo,
  type GoodFirstIssue,
} from "@/lib/github";
import {
  numberLines,
  permalink,
  verifyCitation,
  windowAround,
} from "@/lib/lines";
import { generateJson } from "@/lib/llm";
import { pickFiles } from "@/lib/pickFiles";
import { buildExplainUserPrompt, EXPLAIN_SYSTEM } from "@/lib/prompts/explain";
import { explainSchema, type ExplainOutput } from "@/lib/schemas";
import { gatherLearnLinks, type LearnLink } from "@/lib/serp";

export type ExplainCitation = {
  path: string;
  start: number;
  end: number;
  url: string;
  why: string;
  verified: true;
};

export type ExplainIssueResult = {
  issue: GoodFirstIssue;
  sha: string;
  owner: string;
  repo: string;
  /** GitHub repo.language (primary language). */
  language: string | null;
  explanation: ExplainOutput;
  citations: ExplainCitation[];
  droppedCitations: number;
  /** Null when fewer than 2 language-relevant results. */
  learn: LearnLink[] | null;
};

const CHECKS_HEADING_RE =
  /^#{1,3}\s+.*(checks?\s+before|before\s+(opening\s+)?(a\s+)?(pr|pull\s+request)|how\s+to\s+(test|check|verify)|testing|verification).*$/i;

/**
 * Pull the "Checks before a PR" (or similar) section from CONTRIBUTING.md.
 * Caps at 3000 characters.
 */
export function extractContributingChecks(md: string | null): string | null {
  if (!md?.trim()) return null;

  const lines = md.split(/\r?\n/);
  let startIdx = lines.findIndex((line) => CHECKS_HEADING_RE.test(line));
  if (startIdx < 0) {
    startIdx = lines.findIndex((line) =>
      /^#{1,3}\s+checks?\s+before\s+a\s+pr\s*$/i.test(line),
    );
  }
  if (startIdx < 0) {
    // Fall back to a truncated whole file so the model still sees commands.
    const clipped = md.trim().slice(0, 3000);
    return clipped.length > 0 ? clipped : null;
  }

  const startLevel = lines[startIdx].match(/^#+/)?.[0].length ?? 2;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+/);
    if (m && m[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  const section = lines.slice(startIdx, endIdx).join("\n").trim();
  if (!section) return null;
  return section.length > 3000 ? section.slice(0, 3000) : section;
}

function buildFileBlock(path: string, fileText: string, focusLine: number | null): string {
  let numbered: string;
  if (focusLine != null && focusLine >= 1) {
    numbered = windowAround(fileText, focusLine, 40).numbered;
  } else {
    numbered = numberLines(fileText, 1, 160);
  }
  return [`### ${path}`, numbered].join("\n");
}

export async function explainIssue(opts: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}): Promise<ExplainIssueResult> {
  const { owner, repo, number: issueNumber, lang } = opts;

  const [repoInfo, issue] = await Promise.all([
    getRepo(owner, repo),
    getIssue(owner, repo, issueNumber),
  ]);
  const sha = repoInfo.headSha;

  const [contributing, picked] = await Promise.all([
    getContributing(owner, repo, sha),
    pickFiles({ owner, repo, sha, issue }),
  ]);

  const contributingSection = extractContributingChecks(contributing);
  const fileTexts = new Map<string, string>();
  const fileBlocks: string[] = [];

  for (const row of picked) {
    try {
      const text = await getFile(owner, repo, sha, row.path);
      fileTexts.set(row.path, text);
      fileBlocks.push(buildFileBlock(row.path, text, row.focusLine));
    } catch (err) {
      console.warn(
        `[explain] failed to fetch ${row.path}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const language = lang?.trim() || repoInfo.language || null;

  const rawExplanation = await generateJson({
    task: "explain",
    system: EXPLAIN_SYSTEM,
    user: buildExplainUserPrompt({
      owner,
      repo,
      issueNumber,
      title: issue.title,
      body: issue.body,
      labels: issue.labels,
      lang: language,
      contributingSection,
      fileBlocks,
    }),
    schema: explainSchema,
    schemaName: "explain_issue",
    effort: "low",
  });

  const parsed = explainSchema.safeParse(rawExplanation);
  if (!parsed.success) {
    throw new Error(`Explain output failed schema: ${parsed.error.message}`);
  }
  const explanation = parsed.data;

  if (!Array.isArray(explanation.files)) {
    throw new Error(
      `Explain output missing files array (got ${typeof explanation.files})`,
    );
  }

  const citations: ExplainCitation[] = [];
  let droppedCitations = 0;

  for (const cite of explanation.files) {
    let text = fileTexts.get(cite.path);
    if (text == null) {
      try {
        text = await getFile(owner, repo, sha, cite.path);
        fileTexts.set(cite.path, text);
      } catch {
        droppedCitations += 1;
        continue;
      }
    }

    const verified = verifyCitation(text, {
      start_line: cite.start_line,
      end_line: cite.end_line,
      quote: cite.quote,
    });

    if (!verified.ok) {
      droppedCitations += 1;
      console.warn(
        `[explain] dropped citation ${cite.path}:${cite.start_line}-${cite.end_line} (${verified.reason})`,
      );
      continue;
    }

    citations.push({
      path: cite.path,
      start: verified.start,
      end: verified.end,
      url: permalink(owner, repo, sha, cite.path, verified.start, verified.end),
      why: cite.why,
      verified: true,
    });
  }

  const learnLinks = await gatherLearnLinks(explanation.concepts, language);

  return {
    issue,
    sha,
    owner,
    repo,
    language,
    explanation,
    citations,
    droppedCitations,
    learn: learnLinks.length >= 2 ? learnLinks : null,
  };
}

/**
 * Same as explainIssue, cached by owner/repo/number/sha so Hints can reuse
 * the Explain payload without a second full fetch+LLM pass.
 */
export async function explainIssueCached(opts: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}): Promise<ExplainIssueResult> {
  const repoInfo = await getRepo(opts.owner, opts.repo);
  const langKey = opts.lang?.trim() || "";
  const key = `explain:${opts.owner}/${opts.repo}:${opts.number}:${repoInfo.headSha}:${langKey}`;
  return cached(key, () => explainIssue(opts));
}
