function headerValue(
  headers: Record<string, string | number | undefined> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  return value === undefined ? undefined : String(value);
}

/** How long to wait after a rate-limit response. Caps at 20s so a cron can still finish. */
export function retryDelayMs(
  headers: Record<string, string | number | undefined> | undefined,
  now = Date.now(),
): number {
  const retryAfter = headerValue(headers, "retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 20_000);
  }
  const reset = headerValue(headers, "x-ratelimit-reset");
  if (reset) {
    const ms = Number(reset) * 1000 - now;
    if (Number.isFinite(ms) && ms > 0) return Math.min(ms, 20_000);
  }
  return 5_000;
}
