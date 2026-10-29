"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useT } from "@/components/language-provider";
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
};

type Row = {
  key: string;
  href: string;
  badge: I18nKey;
  title: string;
  detail?: string;
  group: "understood" | "live" | "recent";
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
  const panelRef = useRef<HTMLUListElement>(null);
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => NO_RECENT);
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(variant === "dialog");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [live, setLive] = useState<LiveIssue[]>([]);
  const [searching, setSearching] = useState(false);
  const [trackedValue, setTrackedValue] = useState(value);
  const reduceMotion = useSyncExternalStore(subscribeMotion, motionNow, () => false);
  if (value !== trackedValue) {
    setTrackedValue(value);
    setActive(0);
    setLive([]);
    setSearching(false);
  }

  const local = useMemo(() => parseOmniQuery(value), [value]);

  const rows: Row[] = useMemo(() => {
    const understood: Row[] = local.map((item) => {
      const copy = flowCopy(item, t);
      return {
        key: item.href,
        href: item.href,
        badge: flowBadge(item.flow),
        title: copy.title,
        detail: copy.detail,
        group: "understood",
      };
    });
    const seen = new Set(understood.map((row) => row.href));
    const liveRows: Row[] = live
      .map((issue) => {
        const href = `/issue/${encodeURIComponent(issue.owner)}/${encodeURIComponent(issue.repo)}/${issue.number}`;
        return {
          key: href,
          href,
          badge: "flow.explain" as const,
          title: issue.title,
          detail: `${issue.owner}/${issue.repo}#${issue.number}`,
          group: "live" as const,
        };
      })
      .filter((row) => !seen.has(row.href));
    const current = value.trim();
    const recentRows: Row[] = recent
      .filter((query) => query !== current)
      .map((query) => ({
        key: `recent:${query}`,
        href: "",
        badge: "search.groupRecent",
        title: query,
        group: "recent" as const,
      }));
    return [...understood, ...liveRows, ...recentRows];
  }, [live, local, recent, t, value]);

  useEffect(() => {
    if (reduceMotion || focused || value.trim()) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((index) => (index + 1) % PLACEHOLDERS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [focused, reduceMotion, value]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2 || queryLooksLikeGitHubUrl(q)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const topic = parseOmniQuery(q).find((item) => item.flow === "match-topic");
      const lang =
        topic && topic.flow === "match-topic" && topic.language
          ? `&lang=${encodeURIComponent(topic.language)}`
          : "";
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}${lang}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) return { issues: [] as LiveIssue[] };
          return (await res.json()) as { issues?: LiveIssue[] };
        })
        .then((json) => {
          setLive(Array.isArray(json.issues) ? json.issues : []);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setLive([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function go(href: string) {
    const query = value.trim();
    if (query) writeRecent(query);
    onNavigate?.();
    router.push(href);
  }

  function activate(row: Row) {
    if (row.group === "recent") {
      setValue(row.title);
      inputRef.current?.focus();
      return;
    }
    go(row.href);
  }

  function submit() {
    const row = rows[active] ?? rows[0];
    if (!row) return;
    activate(row);
  }

  const listOpen =
    (focused || variant === "dialog") &&
    (rows.length > 0 || searching) &&
    (value.trim().length > 0 || recent.length > 0);
  const placeholder = t(PLACEHOLDERS[placeholderIndex] ?? "hero.placeholderLang");

  useLayoutEffect(() => {
    if (!listOpen) return;
    const place = () => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const rect = anchor.getBoundingClientRect();
      const room = window.innerHeight - rect.bottom - 12;
      panel.style.top = `${Math.round(rect.bottom + 8)}px`;
      panel.style.left = `${Math.round(rect.left)}px`;
      panel.style.width = `${Math.round(rect.width)}px`;
      panel.style.maxHeight = `${Math.max(140, Math.min(360, room))}px`;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [listOpen, rows.length]);

  return (
    <div ref={anchorRef} className={cn("relative w-full", variant === "hero" && "mx-auto max-w-2xl")}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          {t("hero.searchLabel")}
        </label>
        <div
          className={cn(
            "flex min-h-16 items-center gap-2 rounded-[1.25rem] border border-[#c5d7f2] bg-white py-2 pr-2 pl-3.5 shadow-[0_12px_40px_rgba(4,115,253,0.1)] focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/20",
            variant === "dialog" && "min-h-[3.25rem] shadow-none",
          )}
        >
          <Image
            src="/brand/logo-mark-192.png"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0"
          />
          <input
            ref={inputRef}
            id={`${listId}-input`}
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
            aria-activedescendant={
              listOpen && rows[active] ? `${listId}-opt-${active}` : undefined
            }
            onChange={(event) => setValue(event.target.value)}
            onFocus={() => {
              setFocused(true);
              document.documentElement.dataset.heroSearch = "open";
            }}
            onBlur={() => {
              setFocused(false);
              delete document.documentElement.dataset.heroSearch;
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(rows.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(0, index - 1));
              } else if (event.key === "Escape") {
                setValue("");
                setLive([]);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-lg"
          />
          <kbd className="hidden shrink-0 items-center rounded-md border border-border bg-[#f4f7fb] px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline-flex">
            {t("hero.kbd")}
          </kbd>
          <button
            type="submit"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={t("search.go")}
          >
            <ArrowRight className="size-4" aria-hidden />
          </button>
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
              className="inline-flex min-h-9 items-center rounded-full border border-[#c5d7f2] bg-white/90 px-3 text-sm text-foreground outline-none hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {t(chip.label)}
            </button>
          ))}
        </div>
      ) : null}

      {listOpen && mounted
        ? createPortal(
        <ul
          ref={panelRef}
          id={listId}
          role="listbox"
          className="search-popover py-1"
        >
          {rows.map((row, index) => {
            const showGroup = index === 0 || rows[index - 1]?.group !== row.group;
            return (
              <li key={row.key} role="presentation">
                {showGroup ? (
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {t(groupLabel(row.group))}
                  </p>
                ) : null}
                <button
                  id={`${listId}-opt-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => activate(row)}
                  className={cn(
                    "flex w-full min-h-11 items-start gap-3 px-3 py-2.5 text-left outline-none",
                    index === active ? "bg-accent" : "bg-white",
                  )}
                >
                  <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                    {t(row.badge)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium break-words text-foreground">
                      {row.title}
                    </span>
                    {row.detail ? (
                      <span className="mt-0.5 block text-xs break-words text-muted-foreground">
                        {row.detail}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
          {searching ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("search.searching")}</li>
          ) : null}
        </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
