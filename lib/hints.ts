import { explainIssueCached, type ExplainIssueResult } from "@/lib/explain";
import { permalink } from "@/lib/lines";
import { generateJson } from "@/lib/llm";
import { parseContentLang } from "@/lib/content-lang";
import {
  buildHintUserPrompt,
  hintsSystemForLang,
} from "@/lib/prompts/hints";
import { hintSchema, type HintOutput } from "@/lib/schemas";

export const ASKED_FOR_CODE_RE =
  /(write|give|send|show)( me)? (the )?(code|fix|solution|patch|diff|answer)|just (do|fix|write) it|full code|copy.?paste/i;

export type HintLevel = 1 | 2 | 3;

export type HintPoint = {
  path: string;
  start_line: number;
  end_line: number;
  url: string;
};

export type GetHintResult = {
  hint: HintOutput;
  askedForCode: boolean;
  points: HintPoint[];
  sha: string;
};

function detectAskedForCode(userMessage: string | null | undefined): boolean {
  if (!userMessage?.trim()) return false;
  return ASKED_FOR_CODE_RE.test(userMessage);
}

function lineLooksLikeCode(line: string): boolean {
  if (/[;{}]\s*$/.test(line)) return true;
  if (/=>/.test(line)) return true;
  if (/\bfn\s/.test(line) || /\bfunction\s/.test(line)) return true;
  if (/\b(const|let|var|async|await|import|export)\b/.test(line)) return true;
  if (/\b(if|else|return|typeof)\s*\(/.test(line)) return true;
  if (/\w+\([^)]*\)/.test(line) && /[{};=]/.test(line)) return true;
  return false;
}

/** True if hint/pseudocode looks like it contains real code. */
export function hintContainsCode(hint: HintOutput): boolean {
  const blob = [hint.hint, ...(hint.pseudocode ?? [])].join("\n");
  if (blob.includes("```")) return true;

  const steps = hint.pseudocode ?? [];
  let codey = 0;
  for (const line of steps) {
    if (lineLooksLikeCode(line)) codey += 1;
  }
  return codey > 2;
}

/** Strip markdown fences and code-like pseudocode lines; keep prose. */
export function stripCodeFromHint(hint: HintOutput): HintOutput {
  const stripFences = (text: string) =>
    text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/```/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

  let pseudocode = hint.pseudocode;
  if (pseudocode) {
    pseudocode = pseudocode
      .map(stripFences)
      .filter((line) => line.trim() && !lineLooksLikeCode(line));
    if (pseudocode.length === 0) pseudocode = null;
  }

  return {
    ...hint,
    hint: stripFences(hint.hint),
    pseudocode,
  };
}

function clampPointsToCitations(
  hint: HintOutput,
  explained: ExplainIssueResult,
): HintPoint[] {
  const allowed = explained.citations;
  const out: HintPoint[] = [];
  const seen = new Set<string>();

  for (const pt of hint.points_to) {
    const match =
      allowed.find(
        (c) =>
          c.path === pt.path &&
          c.start === pt.start_line &&
          c.end === pt.end_line,
      ) ??
      allowed.find(
        (c) =>
          c.path === pt.path &&
          pt.start_line >= c.start &&
          pt.end_line <= c.end,
      ) ??
      allowed.find((c) => c.path === pt.path);

    if (!match) continue;
    const start = match.start;
    const end = match.end;
    const key = `${match.path}:${start}-${end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      path: match.path,
      start_line: start,
      end_line: end,
      url: permalink(
        explained.owner,
        explained.repo,
        explained.sha,
        match.path,
        start,
        end,
      ),
    });
    if (out.length >= 3) break;
  }

  // Ensure level-1 demos always have something to point at when citations exist.
  if (out.length === 0 && allowed[0]) {
    const c = allowed[0];
    out.push({
      path: c.path,
      start_line: c.start,
      end_line: c.end,
      url: c.url,
    });
  }

  return out;
}

async function callHintModel(opts: {
  explained: ExplainIssueResult;
  level: HintLevel;
  askedForCode: boolean;
  userMessage: string | null;
  previousHints: string[];
  lang?: string | null;
  extraInstruction?: string | null;
}): Promise<HintOutput> {
  const { explained } = opts;
  const contentLang = parseContentLang(opts.lang);
  const raw = await generateJson({
    task: "hint",
    system: hintsSystemForLang(contentLang),
    user: buildHintUserPrompt({
      owner: explained.owner,
      repo: explained.repo,
      issueNumber: explained.issue.number,
      title: explained.issue.title,
      body: explained.issue.body,
      level: opts.level,
      askedForCode: opts.askedForCode,
      userMessage: opts.userMessage,
      previousHints: opts.previousHints,
      summary: explained.explanation.summary,
      citations: explained.citations.map((c) => ({
        path: c.path,
        start: c.start,
        end: c.end,
        why: c.why,
      })),
      codeLang: explained.language,
      extraInstruction: opts.extraInstruction,
    }),
    schema: hintSchema,
    schemaName: "hint",
    effort: "low",
  });

  const parsed = hintSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Hint output failed schema: ${parsed.error.message}`);
  }

  let hint = parsed.data;
  // Force level and refusal consistency with the request.
  hint = {
    ...hint,
    level: opts.level,
    refused: opts.askedForCode ? true : hint.refused,
    refusal_message: opts.askedForCode
      ? hint.refusal_message?.trim() ||
        "I won't write it for you, because a PR you wrote yourself is one you can explain to the maintainer. Here's a nudge."
      : hint.refused
        ? hint.refusal_message
        : null,
    pseudocode: opts.level === 3 ? hint.pseudocode : null,
  };

  return hint;
}

export async function getHint(opts: {
  owner: string;
  repo: string;
  number: number;
  level: HintLevel;
  userMessage?: string | null;
  previousHints?: string[];
  lang?: string | null;
}): Promise<GetHintResult> {
  const level = opts.level;
  if (level !== 1 && level !== 2 && level !== 3) {
    throw new Error("level must be 1, 2, or 3");
  }

  const userMessage = opts.userMessage?.trim() || null;
  const askedForCode = detectAskedForCode(userMessage);
  const previousHints = opts.previousHints ?? [];

  const explained = await explainIssueCached({
    owner: opts.owner,
    repo: opts.repo,
    number: opts.number,
    lang: opts.lang,
  });

  let hint = await callHintModel({
    explained,
    level,
    askedForCode,
    userMessage,
    previousHints,
    lang: opts.lang,
  });

  if (hintContainsCode(hint)) {
    console.warn("[hints] code detected; retrying with plain-English instruction");
    hint = await callHintModel({
      explained,
      level,
      askedForCode,
      userMessage,
      previousHints,
      lang: opts.lang,
      extraInstruction:
        "Your last answer contained code. Use plain English steps.",
    });
    if (hintContainsCode(hint)) {
      hint = stripCodeFromHint(hint);
    }
  }

  const points = clampPointsToCitations(hint, explained);

  return {
    hint: {
      ...hint,
      points_to: points.map((p) => ({
        path: p.path,
        start_line: p.start_line,
        end_line: p.end_line,
      })),
    },
    askedForCode,
    points,
    sha: explained.sha,
  };
}
