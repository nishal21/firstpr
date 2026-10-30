/**
 * Small client for Runware's OpenAI-compatible chat endpoint, used for the
 * cheap advisory checks in the PR comment. No key means every call returns null.
 * Docs: https://runware.ai/docs/platform/openai
 */
import { getEnv } from "./env.ts";

export const RUNWARE_CHAT_URL = "https://api.runware.ai/v1/chat/completions";
/** Claude Haiku 5.5 on Runware: $0.10 per 1M input tokens and $0.50 per 1M output, up to 100K context. */
export const RUNWARE_DEFAULT_MODEL = "anthropic:claude@haiku-5.5";
const TIMEOUT_MS = 20_000;

export function runwareConfigured(): boolean {
  return Boolean(getEnv().RUNWARE_API_KEY);
}

export type RunwareReply = { text: string; inputTokens: number | null; outputTokens: number | null };

/** One chat call. Returns null when unconfigured, on timeout, or on any error; it never throws. */
export async function runwareChat(opts: {
  task: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  timeoutMs?: number;
}): Promise<RunwareReply | null> {
  const env = getEnv();
  const key = env.RUNWARE_API_KEY;
  if (!key) return null;
  const model = env.RUNWARE_MODEL || RUNWARE_DEFAULT_MODEL;
  const started = Date.now();
  try {
    const res = await fetch(RUNWARE_CHAT_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        max_completion_tokens: opts.maxOutputTokens,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[runware] task=${opts.task} status=${res.status}`);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content;
    const reply: RunwareReply = {
      text: typeof text === "string" ? text : "",
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null,
    };
    console.log(
      `[runware] task=${opts.task} model=${model} input_tokens=${reply.inputTokens ?? "n/a"} output_tokens=${reply.outputTokens ?? "n/a"} duration_ms=${Date.now() - started}`,
    );
    return reply.text ? reply : null;
  } catch (err) {
    console.warn(`[runware] task=${opts.task} failed:`, (err as Error)?.name ?? "error");
    return null;
  }
}

/** Pull the first JSON object out of a model reply, tolerating code fences and chatter. */
export function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
