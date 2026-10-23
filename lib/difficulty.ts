import OpenAI from "openai";
import { cacheGet, cacheSet, CACHE_TTL_MS } from "@/lib/cache";
import { getEnv } from "@/lib/env";
import { generateJson } from "@/lib/llm";
import { difficultySchema, type DifficultyOutput } from "@/lib/schemas";

const SYSTEM = `You rate how hard a GitHub issue is for someone making their first open-source pull request.
Return ONLY JSON: {"level":"easy"|"medium"|"hard","reason":"one short sentence"}.
- easy: small, clear change; files and steps are obvious; good for a true beginner.
- medium: doable but needs more reading or a few files; stretch for a first PR.
- hard: large, vague, needs deep codebase knowledge, or many edge cases.
Base the rating only on the title and body you are given. No markdown.`;

const TIMEOUT_MS = 8_000;

function stripThinkAndExtractJson(text: string): string {
  let s = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

async function viaGemma(
  title: string,
  bodySnippet: string,
): Promise<DifficultyOutput | null> {
  const e = getEnv();
  if (!e.NEYSA_GEMMA_KEY || !e.NEYSA_GEMMA_URL || !e.NEYSA_GEMMA_MODEL) {
    return null;
  }

  try {
    const client = new OpenAI({
      baseURL: e.NEYSA_GEMMA_URL,
      apiKey: e.NEYSA_GEMMA_KEY,
    });
    const completion = await client.chat.completions.create(
      {
        model: e.NEYSA_GEMMA_MODEL,
        temperature: 0.1,
        max_tokens: 120,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Title: ${title}\n\nBody:\n${bodySnippet || "(empty)"}`,
          },
        ],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    const content = completion.choices[0]?.message?.content;
    if (!content) return null;
    const raw = JSON.parse(stripThinkAndExtractJson(content));
    const parsed = difficultySchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.warn(
      "[difficulty] gemma failed:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function viaOpenAI(
  title: string,
  bodySnippet: string,
): Promise<DifficultyOutput> {
  return generateJson({
    task: "difficulty",
    system: SYSTEM,
    user: `Title: ${title}\n\nBody:\n${bodySnippet || "(empty)"}`,
    schema: difficultySchema,
    schemaName: "difficulty",
    effort: "low",
  });
}

const FALLBACK: DifficultyOutput = {
  level: "medium",
  reason: "Could not rate difficulty automatically.",
};

/**
 * Cheap difficulty check. Prefer Neysa Gemma; fall back to OpenAI (low effort).
 * Defaults to medium if both fail so we do not over-promote unknowns as easy.
 * Only successful ratings are cached (failures must not stick for the TTL).
 */
export async function assessDifficulty(opts: {
  title: string;
  body: string | null;
  cacheKey?: string;
}): Promise<DifficultyOutput> {
  const bodySnippet = (opts.body ?? "").slice(0, 1500);
  const key =
    opts.cacheKey ??
    `difficulty:${opts.title.slice(0, 80)}:${bodySnippet.slice(0, 200)}`;

  const hit = cacheGet<DifficultyOutput>(key);
  if (hit) return hit;

  const gemma = await viaGemma(opts.title, bodySnippet);
  if (gemma) {
    cacheSet(key, gemma, CACHE_TTL_MS);
    return gemma;
  }
  try {
    const openai = await viaOpenAI(opts.title, bodySnippet);
    cacheSet(key, openai, CACHE_TTL_MS);
    return openai;
  } catch (err) {
    console.warn(
      "[difficulty] openai failed:",
      err instanceof Error ? err.message : err,
    );
    return FALLBACK;
  }
}

export function difficultyBadgeLabel(
  level: "easy" | "medium" | "hard",
): string {
  if (level === "easy") return "Beginner-friendly";
  if (level === "medium") return "Stretch";
  return "Hard";
}
