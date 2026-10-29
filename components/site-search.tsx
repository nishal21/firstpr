"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CircleDot,
  Clock,
  FolderGit2,
  GitPullRequest,
  Languages,
  Link2,
  ListChecks,
  Search,
  UserRound,
} from "lucide-react";
import { useT } from "@/components/language-provider";
import { SearchByAlgolia } from "@/components/search-by-algolia";
import { SearchKeycaps } from "@/components/search-keycaps";
import { algoliaSearchEnabled, searchAlgoliaIssues } from "@/lib/algolia-search";
import type { HighlightPart } from "@/lib/algolia-plan";
import {
  parseOmniQuery,
  queryLooksLikeGitHubUrl,
  type SearchFlow,
} from "@/lib/omnisearch";
import type { I18nKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LiveIssue = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  labels?: string[];
  createdAt?: string;
  titleParts?: HighlightPart[];
  detailParts?: HighlightPart[];
};

type RowKind =
  | "paste"
  | "browse"
  | "language"
  | "recent"
  | "issue"
  | SearchFlow["flow"];

type Row = {
  key: string;
  kind: RowKind;
  title: string;
  detail?: string;
  group: "quick" | "understood" | "live" | "recent";
  href?: string;
  badge?: I18nKey;
  labels?: string[];
  createdAt?: string;
  query?: string;
  titleParts?: HighlightPart[];
  detailParts?: HighlightPart[];
};

const RECENT_KEY = "firstpr-recent-searches";
const RECENT_EVENT = "firstpr-recent-change";

const CHIPS = [
  { label: "hero.chipPython", query: "python" },
  { label: "hero.chipJs", query: "javascript" },
  { label: "hero.chipDocs", query: "docs" },
  { label: "hero.chipGfi", query: "good first issue" },
  { label: "hero.chipPaste", query: "" },
] as const satisfies readonly { label: I18nKey; query: string }[];

const NO_RECENT: string[] = [];
let recentSnapshot: string[] = NO_RECENT;
let recentSource: string | null | undefined;

function readRecent(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(RECENT_KEY);
  } catch {
    raw = null;
  }
  if (raw === recentSource) return recentSnapshot;
  recentSource = raw;
  if (!raw) {
    recentSnapshot = NO_RECENT;
    return recentSnapshot;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      recentSnapshot = NO_RECENT;
      return recentSnapshot;
    }
    const next = parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, 5);
    recentSnapshot = next.length > 0 ? next : NO_RECENT;
    return recentSnapshot;
  } catch {
    recentSnapshot = NO_RECENT;
    return recentSnapshot;
  }
}

function writeRecent(query: string) {
  const next = [query, ...readRecent().filter((item) => item !== query)].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  recentSource = undefined;
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function clearRecent() {
  localStorage.setItem(RECENT_KEY, "[]");
  recentSource = undefined;
  window.dispatchEvent(new Event(RECENT_EVENT));
}

function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_EVENT, onChange);
  };
}

function groupLabel(group: Row["group"]): I18nKey {
  switch (group) {
    case "quick":
      return "search.groupQuick";
    case "understood":
      return "search.groupUnderstood";
    case "live":
      return "search.groupLive";
    case "recent":
      return "search.groupRecent";
    default: {
      const exhaustive: never = group;
      return exhaustive;
    }
  }
}

function subscribeMounted() {
  return () => {};
}

function subscribeMotion(onChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function motionNow() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const PLACEHOLDERS = [
  "hero.placeholderLang",
  "hero.placeholderSkill",
  "hero.placeholderWords",
  "hero.placeholderIssue",
  "hero.placeholderPr",
  "hero.placeholderUser",
] as const satisfies readonly I18nKey[];

function flowBadge(flow: SearchFlow["flow"]): I18nKey {
  switch (flow) {
    case "explain":
      return "flow.explain";
    case "review":
      return "flow.review";
    case "readiness":
      return "flow.readiness";
    case "match-user":
    case "match-topic":
      return "flow.match";
    default: {
      const exhaustive: never = flow;
      return exhaustive;
    }
  }
}

function flowCopy(
  item: SearchFlow,
  t: (key: I18nKey, params?: Record<string, string | number>) => string,
): { title: string; detail?: string } {
  switch (item.flow) {
    case "explain":
      return {
        title: t("search.explain", {
          owner: item.owner,
          repo: item.repo,
          number: item.number,
        }),
      };
    case "review":
      return {
        title: t("search.review", {
          owner: item.owner,
          repo: item.repo,
          number: item.number,
        }),
      };
    case "readiness":
      return {
        title: t("search.readiness", { owner: item.owner, repo: item.repo }),
      };
    case "match-user":
      return { title: t("search.matchUser", { username: item.username }) };
    case "match-topic":
      return {
        title: t("search.matchTopic", { query: item.query }),
        detail: item.language,
      };
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

function RowIcon({ kind }: { kind: RowKind }) {
  const className = "size-4";
  switch (kind) {
    case "paste":
      return <Link2 className={className} aria-hidden />;
    case "browse":
      return <ListChecks className={className} aria-hidden />;
    case "language":
      return <Languages className={className} aria-hidden />;
    case "recent":
      return <Clock className={className} aria-hidden />;
    case "issue":
      return <CircleDot className={className} aria-hidden />;
    case "explain":
      return <BookOpen className={className} aria-hidden />;
    case "review":
      return <GitPullRequest className={className} aria-hidden />;
    case "readiness":
      return <FolderGit2 className={className} aria-hidden />;
    case "match-user":
      return <UserRound className={className} aria-hidden />;
    case "match-topic":
      return <Search className={className} aria-hidden />;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function Marked({ parts }: { parts: HighlightPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.mark ? (
          <mark key={index} className="bg-transparent font-semibold text-primary">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (needle.length < 2) return text;
  const at = text.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-primary">
        {text.slice(at, at + needle.length)}
      </mark>
      {text.slice(at + needle.length)}
    </>
  );
}

function issueAge(iso: string | undefined, today: string): string {
  if (!iso) return "";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
  if (days < 1) return today;
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function SiteSearch({
  variant = "hero",
  onNavigate,
}: {
  variant?: "hero" | "dialog";
  onNavigate?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => NO_RECENT);
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(variant === "dialog");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [live, setLive] = useState<LiveIssue[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<"rate" | "generic" | null>(null);
  const [settledFor, setSettledFor] = useState<string | null>(null);
  const [trackedValue, setTrackedValue] = useState(value);
  const [panelOn, setPanelOn] = useState(false);
  const [closing, setClosing] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeMotion, motionNow, () => false);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setActive(0);
    setLive([]);
    setSearching(false);
    setSearchError(null);
    setSettledFor(null);
  }

  const local = useMemo(() => parseOmniQuery(value), [value]);
  const trimmed = value.trim();

  const rows: Row[] = useMemo(() => {
    const quick: Row[] =
      trimmed.length === 0
        ? [
            {
              key: "quick:paste",
              kind: "paste",
              title: t("search.pasteLink"),
              detail: t("search.pasteHint"),
              group: "quick",
            },
            {
              key: "quick:browse",
              kind: "browse",
              title: t("search.browseGfi"),
              detail: t("hero.chipGfi"),
              group: "quick",
              href: "/?q=good%20first%20issue#match",
              query: "good first issue",
            },
            {
              key: "quick:language",
              kind: "language",
              title: t("search.byLanguage"),
              detail: t("search.byLanguageHint"),
              group: "quick",
            },
          ]
        : [];
    const understood: Row[] = local.map((item) => {
      const copy = flowCopy(item, t);
      return {
        key: item.href,
        kind: item.flow,
        href: item.href,
        badge: flowBadge(item.flow),
        title: copy.title,
        detail: copy.detail,
        group: "understood" as const,
      };
    });
    const seen = new Set(understood.map((row) => row.href));
    const liveRows: Row[] = live
      .map((issue) => {
        const href = `/issue/${encodeURIComponent(issue.owner)}/${encodeURIComponent(issue.repo)}/${issue.number}`;
        return {
          key: href,
          kind: "issue" as const,
          href,
          badge: "flow.explain" as const,
          title: issue.title,
          detail: `${issue.owner}/${issue.repo}`,
          labels: issue.labels,
          createdAt: issue.createdAt,
          titleParts: issue.titleParts,
          detailParts: issue.detailParts,
          group: "live" as const,
        };
      })
      .filter((row) => !seen.has(row.href));
    const recentRows: Row[] = recent
      .filter((query) => query !== trimmed)
      .map((query) => ({
        key: `recent:${query}`,
        kind: "recent" as const,
        title: query,
        query,
        group: "recent" as const,
      }));
    return [...quick, ...understood, ...liveRows, ...recentRows];
  }, [live, local, recent, t, trimmed]);

  if (rows.length > 0 && active >= rows.length) setActive(rows.length - 1);

  const listOpen = (focused || variant === "dialog") && (rows.length > 0 || searching);
  if (listOpen && !panelOn) {
    setPanelOn(true);
    if (closing) setClosing(false);
  }
  if (!listOpen && panelOn && reduceMotion) setPanelOn(false);
  if (!listOpen && panelOn && !closing && !reduceMotion) setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const id = window.setTimeout(() => {
      setPanelOn(false);
      setClosing(false);
    }, 140);
    return () => window.clearTimeout(id);
  }, [closing]);

  useEffect(() => {
    if (reduceMotion || focused || trimmed) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [focused, reduceMotion, trimmed]);

  useEffect(() => {
    if (trimmed.length < 2 || queryLooksLikeGitHubUrl(trimmed)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const topic = parseOmniQuery(trimmed).find((item) => item.flow === "match-topic");
      const lang =
        topic && topic.flow === "match-topic" && topic.language
          ? `&lang=${encodeURIComponent(topic.language)}`
          : "";
      setSearching(true);
      const algolia = algoliaSearchEnabled()
        ? searchAlgoliaIssues(trimmed, topic && topic.flow === "match-topic" ? topic.language : undefined).catch(
            (err: unknown) => {
              if (err instanceof DOMException && err.name === "AbortError") throw err;
              return null;
            },
          )
        : Promise.resolve(null);
      algolia
        .then(async (hits) => {
          if (controller.signal.aborted) return null;
          if (hits) return { issues: hits as LiveIssue[], error: null };
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${lang}`, {
            signal: controller.signal,
          });
          const json = (await res.json()) as { issues?: LiveIssue[]; error?: string };
          if (!res.ok || json.error === "generic") {
            return { issues: [] as LiveIssue[], error: "generic" as const };
          }
          if (json.error === "rate_limited") {
            return { issues: [] as LiveIssue[], error: "rate" as const };
          }
          return { issues: Array.isArray(json.issues) ? json.issues : [], error: null };
        })
        .then((json) => {
          if (!json || controller.signal.aborted) return;
          setLive(json.issues);
          setSearchError(json.error);
          setSettledFor(trimmed);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setLive([]);
          setSearchError("generic");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    if (!panelOn) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId, panelOn]);

  function go(href: string, query?: string) {
    const saved = (query ?? trimmed).trim();
    if (saved) writeRecent(saved);
    onNavigate?.();
    router.push(href);
  }

  async function pasteLink() {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setValue(text.slice(0, 240));
    } catch {
      inputRef.current?.focus();
    }
  }

  function activate(row: Row) {
    if (row.kind === "paste") {
      void pasteLink();
      return;
    }
    if (row.kind === "language") {
      setValue("python");
      inputRef.current?.focus();
      return;
    }
    if (row.kind === "recent" && row.query) {
      setValue(row.query);
      inputRef.current?.focus();
      return;
    }
    if (row.href) go(row.href, row.query);
  }

  function submit() {
    const row = rows[active] ?? rows[0];
    if (!row) return;
    activate(row);
  }

  const placeholder = t(PLACEHOLDERS[placeholderIndex] ?? "hero.placeholderLang");
  const showLiveStatus =
    trimmed.length >= 2 && !queryLooksLikeGitHubUrl(trimmed) && !rows.some((row) => row.group === "live");

  useLayoutEffect(() => {
    if (!panelOn || variant === "dialog") return;
    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const sheet = window.innerWidth < 640;
      const room = window.innerHeight - rect.bottom - 16;
      panel.dataset.sheet = sheet ? "true" : "false";
      panel.style.top = `${Math.round(rect.bottom + 8)}px`;
      panel.style.left = sheet ? "0px" : `${Math.round(rect.left)}px`;
      panel.style.width = sheet ? "100%" : `${Math.round(rect.width)}px`;
      panel.style.maxHeight = "none";
      const list = listRef.current;
      if (list) {
        list.style.maxHeight = `${Math.max(148, Math.min(sheet ? 340 : 380, room - 40))}px`;
      }
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [panelOn, rows.length, searching, variant]);

  return (
    <div ref={anchorRef} className={cn("relative w-full", variant === "hero" && "mx-auto max-w-2xl")}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={variant === "hero" ? "firstpr-search" : `${listId}-input`} className="sr-only">
          {t("hero.searchLabel")}
        </label>
        <div
          className={cn(
            "search-sticker flex min-h-16 items-center gap-3 py-2 pr-2 pl-3.5",
            variant === "dialog" && "min-h-[3.25rem] shadow-none",
          )}
        >
          <span className="search-prompt font-plex shrink-0" aria-hidden>
            &gt;
          </span>
          <input
            ref={inputRef}
            id={variant === "hero" ? "firstpr-search" : `${listId}-input`}
            value={value}
            placeholder={placeholder}
            autoFocus={variant === "dialog"}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={listOpen && rows[active] ? `${listId}-opt-${active}` : undefined}
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => {
              setFocused(true);
              if (variant === "hero") document.documentElement.dataset.heroSearch = "open";
            }}
            onBlur={() => {
              setFocused(false);
              if (variant === "hero") delete document.documentElement.dataset.heroSearch;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => (rows.length === 0 ? 0 : (index + 1) % rows.length));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => (rows.length === 0 ? 0 : (index - 1 + rows.length) % rows.length));
              } else if (event.key === "Escape" && variant === "hero") {
                event.preventDefault();
                inputRef.current?.blur();
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-lg"
          />
          <span className="flex shrink-0 items-center gap-3">
            {variant !== "dialog" && !focused && trimmed.length === 0 ? <SearchKeycaps /> : null}
            {variant === "hero" && trimmed.length > 0 ? (
              <span className="search-kbd-row">
                <kbd className="search-kbd">esc</kbd>
                <span className="search-kbd-note">{t("search.toClear")}</span>
              </span>
            ) : null}
            <button
              type="submit"
              className="inline-flex size-11 shrink-0 items-center justify-center border-[3px] border-[#16140f] bg-[#0473fd] text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140f]"
              aria-label={t("search.go")}
            >
            <ArrowRight className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      </form>

      {variant === "hero" ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (chip.query) setValue(chip.query);
                inputRef.current?.focus();
              }}
              className={cn(
                "search-chip inline-flex min-h-9 items-center px-2.5 text-xs outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16140f]",
                chip.query === "" && "search-chip-diff",
              )}
            >
              {t(chip.label)}
            </button>
          ))}
        </div>
      ) : null}

      {(() => {
        const results = (
          <>
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={t("search.open")}
                className="search-popover-list py-1"
              >
                {(["quick", "understood", "live", "recent"] as const).map((group) => {
                  const items = rows
                    .map((row, index) => ({ row, index }))
                    .filter((item) => item.row.group === group);
                  const pendingLive = group === "live" && showLiveStatus && settledFor !== trimmed;
                  if (items.length === 0 && !pendingLive && !(group === "live" && showLiveStatus && settledFor === trimmed)) {
                    return null;
                  }
                  return (
                    <li key={group} role="presentation">
                      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                          {t(groupLabel(group))}
                        </p>
                        {group === "recent" && items.length > 0 ? (
                          <button
                            type="button"
                            className="text-[11px] font-medium text-muted-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={clearRecent}
                          >
                            {t("search.clearRecent")}
                          </button>
                        ) : null}
                      </div>
                      {pendingLive ? (
                        <div className="space-y-1.5 px-3 pb-2" aria-hidden>
                          <div className="search-skel" />
                          <div className="search-skel" />
                          <div className="search-skel" />
                        </div>
                      ) : null}
                      {group === "live" && showLiveStatus && settledFor === trimmed && searchError === "rate" ? (
                        <p className="px-3 pb-2 text-sm text-muted-foreground">{t("search.errorRate")}</p>
                      ) : null}
                      {group === "live" && showLiveStatus && settledFor === trimmed && searchError === "generic" ? (
                        <p className="px-3 pb-2 text-sm text-muted-foreground">{t("search.errorGeneric")}</p>
                      ) : null}
                      {group === "live" && showLiveStatus && settledFor === trimmed && !searchError ? (
                        <p className="px-3 pb-2 text-sm text-muted-foreground">{t("search.emptyLive")}</p>
                      ) : null}
                      {items.map(({ row, index }) => {
                        const age = issueAge(row.createdAt, t("search.ageToday"));
                        return (
                          <button
                            key={row.key}
                            id={`${listId}-opt-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === active}
                            onMouseEnter={() => setActive(index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => activate(row)}
                            className={cn(
                              "mx-1.5 flex w-[calc(100%-0.75rem)] min-h-11 items-start gap-2.5 rounded-lg px-2 py-2 text-left outline-none",
                              index === active ? "bg-accent text-accent-foreground" : "text-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-md",
                                index === active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                              )}
                            >
                              <RowIcon kind={row.kind} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="text-sm leading-5 font-medium break-words">
                                  {row.titleParts ? (
                                    <Marked parts={row.titleParts} />
                                  ) : (
                                    <Highlight text={row.title} query={trimmed} />
                                  )}
                                </span>
                                {age ? (
                                  <span className="shrink-0 text-[11px] text-muted-foreground">{age}</span>
                                ) : null}
                              </span>
                              {row.detail || (row.labels && row.labels.length > 0) ? (
                                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                  {row.detail ? (
                                    <span className="text-xs text-muted-foreground">
                                      {row.detailParts ? (
                                        <Marked parts={row.detailParts} />
                                      ) : (
                                        <Highlight text={row.detail} query={trimmed} />
                                      )}
                                    </span>
                                  ) : null}
                                  {row.labels?.slice(0, 2).map((label) => (
                                    <span
                                      key={label}
                                      className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                                    >
                                      {label}
                                    </span>
                                  ))}
                                </span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
              <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                <span>{t("search.keys")}</span>
                <span>{t("search.keyOpen")}</span>
                <span>{t("search.keyClose")}</span>
                <span className="hidden sm:inline">{t("search.slash")}</span>
                {algoliaSearchEnabled() ? (
                  <a
                    href="https://www.algolia.com/?utm_medium=AOS-referral"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Search by Algolia"
                    className="ml-auto inline-flex items-center"
                  >
                    <SearchByAlgolia />
                  </a>
                ) : null}
              </div>
          </>
        );
        if (variant === "dialog") {
          return panelOn ? <div className="search-dialog-results">{results}</div> : null;
        }
        if (!panelOn || !mounted) return null;
        return createPortal(
          <div
            ref={panelRef}
            className="search-popover"
            data-closing={closing ? "true" : "false"}
          >
            {results}
          </div>,
          document.body,
        );
      })()}
    </div>
  );
}
