// Scrubs Sentry events before they leave the process (browser, Node, edge).
// No imports on purpose: it runs in every runtime and in plain `node` tests.

export const FILTERED = "[Filtered]";

/** Object keys whose values are always dropped, wherever they sit in an event. */
const SECRET_KEY =
  /^(authorization|proxy-authorization|cookie|cookies|set-cookie|x-hub-signature(-256)?|x-api-key|x-algolia-api-key)$|token(?!s)|secret|passw|private[_-]?key|privatekey|api[_-]?key|apikey|client[_-]?secret|credential|(^|[_.-])auth($|[_.-])/i;

/** Request headers worth keeping. Everything else is dropped. */
export const SAFE_REQUEST_HEADERS = [
  "accept",
  "content-type",
  "content-length",
  "host",
  "referer",
  "user-agent",
  "x-github-event",
  "x-github-delivery",
  "x-github-hook-installation-target-type",
  "x-vercel-id",
] as const;

const SAFE_HEADERS: ReadonlySet<string> = new Set(SAFE_REQUEST_HEADERS);

/** Query parameter names that may carry a secret. */
const SECRET_PARAM =
  /([?&;](?:[^=&#\s"']*(?:token|secret|passw|api[_-]?key|apikey|signature|sig|auth|code|session|jwt|dsn)[^=&#\s"']*)=)[^&#\s"']*/gi;

const STRING_RULES: [RegExp, string][] = [
  // PEM private keys, even when cut off before the END line.
  [/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g, "[Filtered private key]"],
  // GitHub tokens: classic, OAuth, user, server, refresh, fine-grained.
  [/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, FILTERED],
  // OpenAI-style and other "sk-" keys.
  [/\bsk-[A-Za-z0-9_-]{16,}/g, FILTERED],
  // JSON Web Tokens (GitHub App JWTs look like this).
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, FILTERED],
  // Authorization header values written out in text.
  [/\b(Bearer|Basic|token)\s+[A-Za-z0-9._~+/=-]{12,}/gi, `$1 ${FILTERED}`],
  // Email addresses.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

/** Redact secrets and emails inside a free-text string. */
export function scrubString(input: string): string {
  let out = input;
  for (const [pattern, replacement] of STRING_RULES) out = out.replace(pattern, replacement);
  return out.replace(SECRET_PARAM, `$1${FILTERED}`);
}

export function isSecretKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

const MAX_DEPTH = 12;

/** Walk any value and scrub it in place. Returns the scrubbed value. */
export function scrubValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value) || depth > MAX_DEPTH) return value;
  seen.add(value);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = scrubValue(value[i], depth + 1, seen);
    return value;
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (isSecretKey(key)) {
      record[key] = FILTERED;
      continue;
    }
    record[key] = scrubValue(record[key], depth + 1, seen);
  }
  return value;
}

type HeaderBag = Record<string, unknown> | [string, unknown][];

function keepSafeHeaders(headers: HeaderBag | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  const kept: Record<string, string> = {};
  for (const [name, raw] of entries) {
    const lower = String(name).toLowerCase();
    if (!SAFE_HEADERS.has(lower)) continue;
    kept[lower] = scrubString(String(raw));
  }
  return kept;
}

type ScrubbableRequest = {
  url?: string;
  headers?: HeaderBag;
  cookies?: unknown;
  data?: unknown;
  query_string?: unknown;
  env?: unknown;
};

type ScrubbableEvent = {
  request?: ScrubbableRequest;
  user?: Record<string, unknown>;
  breadcrumbs?: unknown[];
  [key: string]: unknown;
};

/**
 * `beforeSend` / `beforeSendTransaction`: drop cookies, bodies, auth
 * headers and user identity, then redact secrets anywhere in the event.
 */
export function scrubEvent<T>(event: T): T {
  const e = event as unknown as ScrubbableEvent;
  if (e.request) {
    const req = e.request;
    delete req.cookies;
    delete req.data;
    delete req.env;
    if (req.headers) req.headers = keepSafeHeaders(req.headers);
    if (typeof req.url === "string") req.url = scrubString(req.url);
    if (typeof req.query_string === "string") {
      req.query_string = scrubString(`?${req.query_string}`).slice(1);
    } else if (req.query_string != null) {
      req.query_string = scrubValue(req.query_string);
    }
  }
  if (e.user) {
    // Only an opaque id may stay. No email, IP, or username.
    const id = e.user.id;
    e.user = id == null ? undefined : { id };
  }
  scrubValue(e);
  return event;
}

/** `beforeBreadcrumb`: same redaction for console, fetch and navigation crumbs. */
export function scrubBreadcrumb<T>(crumb: T): T {
  scrubValue(crumb);
  return crumb;
}