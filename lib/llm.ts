import { zodTextFormat } from "openai/helpers/zod";
import type { ReasoningEffort } from "openai/resources/shared";
import { z } from "zod";
import { env } from "@/lib/env";
import { withOpenAI } from "@/lib/openai";

export type LlmTask = "first_pass" | "explain" | "hint" | "review" | "difficulty";

export type LlmErrorCode = "timeout" | "bad_output" | "provider_error";

export class LlmError extends Error {
  readonly code: LlmErrorCode;

  constructor(message: string, code: LlmErrorCode) {
    super(message);
    this.name = "LlmError";
    this.code = code;
  }
}

type GenerateJsonArgs<T> = {
  task: LlmTask;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  schemaName: string;
  effort: ReasoningEffort;
};

const TIMEOUT_MS = 45_000;

const pingSchema = z.object({
  ok: z.literal(true),
});

function modelForTask(task: LlmTask): string {
  return task === "review" ? env.OPENAI_REVIEW_MODEL : env.OPENAI_MODEL;
}

function logLlm(opts: {
  task: LlmTask;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number;
}) {
  console.log(
    `[llm] task=${opts.task} model=${opts.model} input_tokens=${opts.inputTokens ?? "n/a"} output_tokens=${opts.outputTokens ?? "n/a"} duration_ms=${opts.durationMs}`,
  );
}

async function withTimeout<T>(promise: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new LlmError(`LLM request timed out after ${ms}ms`, "timeout"));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateViaOpenAI<T>({
  task,
  system,
  user,
  schema,
  schemaName,
  effort,
}: GenerateJsonArgs<T>): Promise<T> {
  const model = modelForTask(task);

  try {
    return await withOpenAI(async (client) => {
      const runOnce = async () => {
        const started = Date.now();
        const response = await withTimeout(
          client.responses.parse({
            model,
            reasoning: { effort },
            input: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            text: { format: zodTextFormat(schema, schemaName) },
          }),
        );

        logLlm({
          task,
          model,
          inputTokens: response.usage?.input_tokens ?? null,
          outputTokens: response.usage?.output_tokens ?? null,
          durationMs: Date.now() - started,
        });

        return response;
      };

      let response = await runOnce();
      if (response.output_parsed == null) {
        response = await runOnce();
      }

      if (response.output_parsed == null) {
        throw new LlmError("Model returned no parsed output", "bad_output");
      }

      return response.output_parsed as T;
    });
  } catch (err) {
    if (err instanceof LlmError) throw err;
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    if (/timeout|aborted|AbortError/i.test(message)) {
      throw new LlmError(message, "timeout");
    }
    throw new LlmError(message, "provider_error");
  }
}

export async function generateJson<T>({
  task,
  system,
  user,
  schema,
  schemaName,
  effort,
}: GenerateJsonArgs<T>): Promise<T> {
  // File pick (Gemma→Qwen→OpenAI) lives in lib/neysa.ts. All OpenAI calls
  // (pickFiles fallback, explain, hint, review) go through withOpenAI.
  return generateViaOpenAI({ task, system, user, schema, schemaName, effort });
}

/** Tiny health check used by /api/debug. */
export async function ping(): Promise<{ ok: true }> {
  return generateJson({
    task: "explain",
    system: "Reply with JSON only. Set ok to true.",
    user: "ping",
    schema: pingSchema,
    schemaName: "ping",
    effort: "low",
  });
}
