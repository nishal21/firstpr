import OpenAI from "openai";
import { getEnv } from "@/lib/env";

function resolveOpenAIBaseURL(): string {
  const configured = getEnv().OPENAI_BASE_URL?.trim();
  const official = "https://api.openai.com/v1";
  if (!configured) return official;
  // Cursor/dev shells often set OPENAI_BASE_URL to a local proxy. If nothing is
  // listening, the SDK fails with ECONNREFUSED — fall back to the real API.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configured)) {
    console.warn(
      `[openai] Ignoring local OPENAI_BASE_URL (${configured}); using ${official}`,
    );
    return official;
  }
  return configured;
}

function makeClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: resolveOpenAIBaseURL(),
  });
}

/** Primary OpenAI client (OPENAI_API_KEY). */
export function getPrimaryOpenAI(): OpenAI {
  const key = getEnv().OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is required");
  }
  return makeClient(key);
}

/** Backup OpenAI client (OPENAI_API_KEY_BACKUP), or null if unset. */
export function getBackupOpenAI(): OpenAI | null {
  const key = getEnv().OPENAI_API_KEY_BACKUP;
  if (!key) return null;
  return makeClient(key);
}

function isZodOrParseError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: string }).name;
  if (name === "ZodError") return true;
  // Our LLM layer marks schema/parse failures as bad_output.
  if (
    name === "LlmError" &&
    (err as { code?: string }).code === "bad_output"
  ) {
    return true;
  }
  return false;
}

function isBadRequest(err: unknown): boolean {
  if (err instanceof OpenAI.APIError && err.status === 400) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /\b400\b|Bad Request/i.test(msg) && !/\b40[13]\b|\b429\b/.test(msg);
}

/** Errors that warrant a single retry on the backup key. */
export function shouldRetryWithBackup(err: unknown): boolean {
  if (isZodOrParseError(err)) return false;
  if (isBadRequest(err)) return false;

  // Timeouts / aborts from our wrapper — not key/auth failures.
  if (
    err &&
    typeof err === "object" &&
    (err as { name?: string }).name === "LlmError" &&
    (err as { code?: string }).code === "timeout"
  ) {
    return false;
  }

  if (err instanceof OpenAI.APIConnectionError) return true;

  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    if (status === 401 || status === 403 || status === 429) return true;
    if (typeof status === "number" && status >= 500) return true;
    if (err.code === "insufficient_quota") return true;
  }

  const msg = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && err.cause instanceof Error
      ? err.cause.message
      : "";
  const blob = `${msg} ${cause}`;

  if (/insufficient[_ ]quota/i.test(blob)) return true;
  if (/\b401\b|\b403\b|\b429\b|Unauthorized|Forbidden|Rate limit/i.test(blob)) {
    return true;
  }
  if (/\b5\d{2}\b|Internal Server Error|Bad Gateway|Service Unavailable/i.test(blob)) {
    return true;
  }
  if (
    /ECONNREFUSED|ENOTFOUND|ECONNRESET|ETIMEDOUT|fetch failed|network|Connection error/i.test(
      blob,
    )
  ) {
    return true;
  }

  return false;
}

function reasonForLog(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    const parts = [
      err.status != null ? `status=${err.status}` : null,
      err.code ? `code=${err.code}` : null,
      err.message ? err.message.slice(0, 120) : null,
    ].filter(Boolean);
    return parts.join(" ") || "APIError";
  }
  if (err instanceof Error) {
    return `${err.name}: ${err.message.slice(0, 120)}`;
  }
  return String(err).slice(0, 120);
}

/**
 * Run `fn` with the primary OpenAI client. On auth/quota/5xx/network failure,
 * retry once with the backup client (if configured). Never logs API keys.
 */
export async function withOpenAI<T>(
  fn: (client: OpenAI) => Promise<T>,
): Promise<T> {
  const primary = getPrimaryOpenAI();
  try {
    return await fn(primary);
  } catch (err) {
    if (!shouldRetryWithBackup(err)) throw err;

    const backup = getBackupOpenAI();
    if (!backup) throw err;

    console.warn(
      `[openai] primary failed (${reasonForLog(err)}); retrying with backup`,
    );
    return await fn(backup);
  }
}
