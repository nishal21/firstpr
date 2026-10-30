/**
 * Make repo text safe to send to a model: drop files that tend to hold
 * secrets, mask anything shaped like a key, and keep to a size budget.
 * Pure, so the verify scripts can check it.
 */

const SECRET_FILE_RE =
  /(^|\/)(\.env[^/]*|\.npmrc|\.pypirc|\.netrc|id_rsa[^/]*|id_ed25519[^/]*|credentials[^/]*|secrets?\.[a-z]+)$|\.(pem|key|p12|pfx|jks|keystore)$/i;
const LOCKFILE_RE =
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/i;

const TOKEN_RES: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  /\b(sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];
/** Long base64 or hex runs with both letters and digits, typical of keys. Paths and long names survive. */
const BLOB_RE = /[A-Za-z0-9+/=]{32,}/g;
function looksLikeKey(run: string): boolean {
  if (run.includes("/") && /^[\w./-]+$/.test(run) && /[a-z]{3}\//i.test(run)) return false;
  return /\d/.test(run) && /[A-Za-z]/.test(run) && !/^[a-z]+$/i.test(run);
}
const ASSIGN_RE =
  /((?:api[_-]?key|secret|token|passw(?:or)?d|private[_-]?key|client[_-]?secret|auth)[\w-]*["']?\s*[:=]\s*)(["']?)[^\s"',;]{6,}\2/gi;

export function isSecretPath(path: string): boolean {
  return SECRET_FILE_RE.test(path);
}

export function redactSecrets(text: string): string {
  let out = text.replace(ASSIGN_RE, (_m, lead: string, q: string) => `${lead}${q}[redacted]${q}`);
  for (const re of TOKEN_RES) out = out.replace(re, "[redacted]");
  return out.replace(BLOB_RE, (run) => (looksLikeKey(run) ? "[redacted]" : run));
}

export function clip(text: string | null | undefined, max: number): string {
  const t = (text ?? "").replace(/\r\n/g, "\n").trim();
  return t.length > max ? `${t.slice(0, max)}\n[cut]` : t;
}

export type DiffFile = { filename: string; status?: string; additions: number; deletions: number; patch: string | null };

/** A compact diff under `budget` characters. Secret-shaped files and lockfiles only show their name. */
export function compactDiff(files: readonly DiffFile[], budget: number): string {
  const parts: string[] = [];
  let used = 0;
  const ordered = [...files].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));
  for (const f of ordered) {
    const head = `--- ${f.filename} (+${f.additions} -${f.deletions})`;
    const hidden = isSecretPath(f.filename) || LOCKFILE_RE.test(f.filename) || !f.patch;
    const body = hidden ? "" : redactSecrets(f.patch ?? "");
    const room = budget - used - head.length - 1;
    if (room <= 0) {
      parts.push(`[${files.length - parts.length} more files not shown]`);
      break;
    }
    const piece = body ? `${head}\n${body.length > room ? `${body.slice(0, Math.max(0, room - 6))}\n[cut]` : body}` : head;
    parts.push(piece);
    used += piece.length + 1;
  }
  return parts.join("\n");
}
