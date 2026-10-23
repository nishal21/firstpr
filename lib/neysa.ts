import OpenAI from "openai";
import { generateJson } from "@/lib/llm";
import { pickFilesSchema } from "@/lib/schemas";

export type FilePickSource = "neysa" | "openai";

export type PickFilesResult = {
  files: string[];
  source: FilePickSource;
};

const PICK_SYSTEM = `You pick the most relevant source files for fixing a GitHub issue.
Return ONLY JSON like {"files":["path",...]} with at most 5 paths.
Every path MUST be copied exactly from the provided file list.
No markdown, no code fences, no other text.`;

const NEYSA_TIMEOUT_MS = 10_000;

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function filterToKnownPaths(files: string[], filePaths: string[]): string[] {
  const allowed = new Set(filePaths);
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

function buildUserPrompt(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
): string {
  return [
    `Issue title: ${issueTitle}`,
    `Issue body:`,
    issueBody || "(empty)",
    ``,
    `Candidate files (${filePaths.length}):`,
    ...filePaths.slice(0, 400),
  ].join("\n");
}

async function pickWithOpenAI(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
): Promise<string[]> {
  const result = await generateJson({
    // Not "first_pass" — that path may re-enter Neysa.
    task: "explain",
    system: PICK_SYSTEM,
    user: buildUserPrompt(issueTitle, issueBody, filePaths),
    schema: pickFilesSchema,
    schemaName: "pick_files",
    effort: "low",
  });
  return filterToKnownPaths(result.files, filePaths);
}

async function pickWithNeysa(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
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
          content: buildUserPrompt(issueTitle, issueBody, filePaths),
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

  return filterToKnownPaths(parsed.data.files, filePaths);
}

/**
 * Pick up to 5 relevant files for an issue.
 * Prefers Neysa (Gemma 4); falls back to OpenAI. Never throws to callers.
 */
export async function pickFiles(
  issueTitle: string,
  issueBody: string,
  filePaths: string[],
): Promise<PickFilesResult> {
  if (filePaths.length === 0) {
    return { files: [], source: "openai" };
  }

  if (!process.env.NEYSA_API_KEY) {
    console.warn("[neysa] pickFiles: NEYSA_API_KEY missing; falling back to OpenAI");
    try {
      return {
        files: await pickWithOpenAI(issueTitle, issueBody, filePaths),
        source: "openai",
      };
    } catch (err) {
      console.warn(
        "[neysa] pickFiles: OpenAI fallback failed:",
        err instanceof Error ? err.message : err,
      );
      return { files: [], source: "openai" };
    }
  }

  try {
    const files = await pickWithNeysa(issueTitle, issueBody, filePaths);
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
        files: await pickWithOpenAI(issueTitle, issueBody, filePaths),
        source: "openai",
      };
    } catch (fallbackErr) {
      console.warn(
        "[neysa] pickFiles: OpenAI fallback failed:",
        fallbackErr instanceof Error ? fallbackErr.message : fallbackErr,
      );
      return { files: [], source: "openai" };
    }
  }
}
