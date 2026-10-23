import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ReasoningEffort } from "openai/resources/shared";
import { z } from "zod";
import { env, getEnv } from "@/lib/env";

export type LlmTask = "first_pass" | "explain" | "hint" | "review";

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

function resolveOpenAIBaseURL(): string {
  const configured = env.OPENAI_BASE_URL?.trim();
  const official = "https://api.openai.com/v1";
  if (!configured) return official;
  // Cursor/dev shells often set OPENAI_BASE_URL to a local proxy. If nothing is
  // listening, the SDK fails with ECONNREFUSED — fall back to the real API.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured)) {
    console.warn(
      `[llm] Ignoring local OPENAI_BASE_URL (${configured}); using ${official}`,
    );
    return official;
  }
  return configured;
}

function getOpenAIClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new LlmError("OPENAI_API_KEY is required", "provider_error");
  }
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: resolveOpenAIBaseURL(),
  });
}

function modelForTask(task: LlmTask): string {
  return task === "review" ? env.OPENAI_REVIEW_MODEL : env.OPENAI_MODEL;
}

function canUseNeysa(): boolean {
  const e = getEnv();
  return (
    e.FIRST_PASS_PROVIDER === "neysa" &&
    Boolean(e.NEYSA_BASE_URL) &&
    Boolean(e.NEYSA_API_KEY) &&
    Boolean(e.NEYSA_MODEL)
  );
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

function toStrictJsonSchema(schema: z.ZodType, name: string): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  delete jsonSchema.id;
  // Ensure the schema is named for providers that expect a top-level object.
  void name;
  return jsonSchema;
}

async function generateViaNeysa<T>({
  task,
  system,
  user,
  schema,
  schemaName,
}: Omit<GenerateJsonArgs<T>, "effort">): Promise<T> {
  const e = getEnv();
  const model = e.NEYSA_MODEL!;
  const client = new OpenAI({
    baseURL: e.NEYSA_BASE_URL,
    apiKey: e.NEYSA_API_KEY,
  });

  const started = Date.now();
  const completion = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: toStrictJsonSchema(schema, schemaName),
        },
      },
    }),
  );

  const durationMs = Date.now() - started;
  logLlm({
    task,
    model,
    inputTokens: completion.usage?.prompt_tokens ?? null,
    outputTokens: completion.usage?.completion_tokens ?? null,
    durationMs,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new LlmError("Neysa returned empty content", "bad_output");
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new LlmError("Neysa returned invalid JSON", "bad_output");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new LlmError(`Neysa JSON failed schema: ${parsed.error.message}`, "bad_output");
  }

  return parsed.data;
}

async function generateViaOpenAI<T>({
  task,
  system,
  user,
  schema,
  schemaName,
  effort,
}: GenerateJsonArgs<T>): Promise<T> {
  const client = getOpenAIClient();
  const model = modelForTask(task);

  const runOnce = async () => {
    const started = Date.now();
    try {
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
    } catch (err) {
      if (err instanceof LlmError) throw err;
      const message = err instanceof Error ? err.message : "OpenAI request failed";
      if (/timeout|aborted|AbortError/i.test(message)) {
        throw new LlmError(message, "timeout");
      }
      throw new LlmError(message, "provider_error");
    }
  };

  let response = await runOnce();
  if (response.output_parsed == null) {
    response = await runOnce();
  }

  if (response.output_parsed == null) {
    throw new LlmError("Model returned no parsed output", "bad_output");
  }

  return response.output_parsed as T;
}

export async function generateJson<T>({
  task,
  system,
  user,
  schema,
  schemaName,
  effort,
}: GenerateJsonArgs<T>): Promise<T> {
  if (task === "first_pass" && canUseNeysa()) {
    try {
      return await generateViaNeysa({ task, system, user, schema, schemaName });
    } catch (err) {
      console.warn(
        "[llm] Neysa first_pass failed; falling back to OpenAI:",
        err instanceof Error ? err.message : err,
      );
    }
  }

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
