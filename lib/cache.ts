import fs from "node:fs";
import path from "node:path";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

/** Default TTL: 10 minutes */
export const CACHE_TTL_MS = 10 * 60 * 1000;

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs = CACHE_TTL_MS,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

/** Keep only [a-z0-9-]; collapse runs of invalid chars into a single hyphen. */
export function sanitizeFixtureKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function demoDir(): string {
  return path.join(process.cwd(), "data", "demo");
}

function fixturePath(key: string): string {
  const safe = sanitizeFixtureKey(key);
  return path.join(demoDir(), `${safe}.json`);
}

/** Read a committed demo fixture from `data/demo/<key>.json`. */
export function getFixture<T = unknown>(key: string): T | null {
  try {
    const file = fixturePath(key);
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write a fixture. Only when RECORD_DEMO=1 and not production
 * (Vercel FS is read-only outside /tmp).
 */
export function saveFixture(key: string, data: unknown): void {
  if (process.env.RECORD_DEMO !== "1") return;
  if (process.env.NODE_ENV === "production") return;
  try {
    const dir = demoDir();
    fs.mkdirSync(dir, { recursive: true });
    const file = fixturePath(key);
    fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`[demo] saved fixture ${path.basename(file)}`);
  } catch (err) {
    console.warn(
      "[demo] saveFixture failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function canWriteFixtures(): boolean {
  return (
    process.env.RECORD_DEMO === "1" && process.env.NODE_ENV !== "production"
  );
}

export function matchFixtureKey(repo: string, username: string): string {
  return sanitizeFixtureKey(`match-${repo}-${username}`);
}

export function explainFixtureKey(
  owner: string,
  repo: string,
  number: number,
  lang: string,
): string {
  return sanitizeFixtureKey(`explain-${owner}-${repo}-${number}-${lang}`);
}

export function hintFixtureKey(
  owner: string,
  repo: string,
  number: number,
  level: number,
  askedForCode: boolean,
  lang: string,
): string {
  return sanitizeFixtureKey(
    `hint-${owner}-${repo}-${number}-${level}-${askedForCode}-${lang}`,
  );
}

export function reviewFixtureKey(prNumber: number, lang: string): string {
  return sanitizeFixtureKey(`review-${prNumber}-${lang}`);
}
