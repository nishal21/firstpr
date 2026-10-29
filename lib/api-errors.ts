/** Map API error codes → short user-facing copy (never a stack). */
export const FRIENDLY_ERROR: Record<string, string> = {
  rate_limited: "GitHub is asking us to slow down. Try again in a minute.",
  timeout: "The AI took too long. Try again.",
  not_found: "Couldn't find that repo, issue or PR.",
  provider_error: "The AI took too long. Try again.",
  bad_output: "The AI took too long. Try again.",
};

export function friendlyErrorMessage(
  code: string | undefined,
  fallback?: string,
): string {
  if (code && FRIENDLY_ERROR[code]) return FRIENDLY_ERROR[code];
  if (fallback?.trim()) return fallback.trim();
  return "Something went wrong. Try again.";
}

export function statusForErrorCode(code: string | undefined): number {
  if (code === "rate_limited") return 429;
  if (code === "not_found" || code === "user_not_found") return 404;
  if (code === "timeout") return 504;
  if (code === "bad_request") return 400;
  return 502;
}
