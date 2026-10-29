export type JourneyKind = "match" | "explain" | "review" | "pr";

export type JourneyEvent = {
  at: string;
  kind: JourneyKind;
  title: string;
  href: string;
  detail?: string;
};

const STORAGE_KEY = "firstpr-journey";
const REVIEW_KEY = "firstpr-review-history";
const JOURNEY_EVENT = "firstpr-journey-change";
const REVIEW_EVENT = "firstpr-review-change";
const MAX_EVENTS = 24;

function notify(name: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

const KINDS: readonly JourneyKind[] = ["match", "explain", "review", "pr"];

function isKind(value: unknown): value is JourneyKind {
  return typeof value === "string" && (KINDS as readonly string[]).includes(value);
}

export function sanitizeEvents(value: unknown): JourneyEvent[] | null {
  if (!Array.isArray(value)) return null;
  const events: JourneyEvent[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") return null;
    const event = row as Partial<JourneyEvent>;
    if (!isKind(event.kind)) return null;
    if (typeof event.title !== "string" || event.title.trim().length === 0) return null;
    if (typeof event.href !== "string" || event.href.length > 500) return null;
    if (typeof event.at !== "string" || Number.isNaN(Date.parse(event.at))) return null;
    const detail = typeof event.detail === "string" ? event.detail.slice(0, 240) : undefined;
    events.push({
      at: event.at,
      kind: event.kind,
      title: event.title.trim().slice(0, 180),
      href: event.href,
      detail,
    });
    if (events.length >= MAX_EVENTS) break;
  }
  return events;
}

export function encodeJourney(events: JourneyEvent[]): string {
  const json = JSON.stringify(events);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function decodeJourney(raw: string): JourneyEvent[] | null {
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return sanitizeEvents(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

export function loadJourney(): JourneyEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sanitizeEvents(JSON.parse(raw) as unknown) ?? [];
  } catch {
    return [];
  }
}

export function saveJourney(events: JourneyEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
    notify(JOURNEY_EVENT);
  } catch {
    /* ignore quota */
  }
}

export function subscribeJourney(onChange: () => void): () => void {
  window.addEventListener(JOURNEY_EVENT, onChange);
  window.addEventListener("hashchange", onChange);
  return () => {
    window.removeEventListener(JOURNEY_EVENT, onChange);
    window.removeEventListener("hashchange", onChange);
  };
}

/** Snapshot string for useSyncExternalStore. Hash shares win over local history. */
export function readJourneySnapshot(): string {
  const hash = window.location.hash;
  if (hash.startsWith("#j=")) return hash;
  return window.localStorage.getItem(STORAGE_KEY) ?? "";
}

export function recordJourney(event: Omit<JourneyEvent, "at"> & { at?: string }): JourneyEvent[] {
  const next: JourneyEvent = {
    at: event.at ?? new Date().toISOString(),
    kind: event.kind,
    title: event.title,
    href: event.href,
    detail: event.detail,
  };
  const current = loadJourney().filter(
    (row) => !(row.kind === next.kind && row.href === next.href),
  );
  const events = [next, ...current].slice(0, MAX_EVENTS);
  saveJourney(events);
  return events;
}

export type ReviewHistoryItem = {
  at: string;
  label: string;
  href: string;
  score: number;
  verdict: string;
};

export function loadReviewHistory(): ReviewHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEW_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is ReviewHistoryItem => {
        if (!row || typeof row !== "object") return false;
        const item = row as Partial<ReviewHistoryItem>;
        return (
          typeof item.at === "string" &&
          typeof item.label === "string" &&
          typeof item.href === "string" &&
          typeof item.score === "number" &&
          typeof item.verdict === "string"
        );
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function pushReviewHistory(item: ReviewHistoryItem): ReviewHistoryItem[] {
  const next = [item, ...loadReviewHistory().filter((row) => row.href !== item.href)].slice(0, 8);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(REVIEW_KEY, JSON.stringify(next));
      notify(REVIEW_EVENT);
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function subscribeReviewHistory(onChange: () => void): () => void {
  window.addEventListener(REVIEW_EVENT, onChange);
  return () => window.removeEventListener(REVIEW_EVENT, onChange);
}

export function readReviewHistorySnapshot(): string {
  return window.localStorage.getItem(REVIEW_KEY) ?? "";
}
