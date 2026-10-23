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
