"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
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

type Row =
  | { key: string; href: string; badge: I18nKey; title: string; detail?: string }
  | { key: string; href: string; badge: I18nKey; title: string; detail: string };

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
    const localRows: Row[] = local.map((item) => {
      const copy = flowCopy(item, t);
      return {
        key: item.href,
        href: item.href,
        badge: flowBadge(item.flow),
        title: copy.title,
        detail: copy.detail,
      };
    });
    const seen = new Set(localRows.map((row) => row.href));
    const liveRows: Row[] = live
      .map((issue) => {
        const href = `/issue/${encodeURIComponent(issue.owner)}/${encodeURIComponent(issue.repo)}/${issue.number}`;
        return {
          key: href,
          href,
          badge: "flow.explain" as const,
          title: issue.title,
          detail: `${issue.owner}/${issue.repo}#${issue.number}`,
        };
      })
      .filter((row) => !seen.has(row.href));
    return [...localRows, ...liveRows];
  }, [live, local, t]);

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
      const topic = local.find((item) => item.flow === "match-topic");
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
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [local, value]);

  function go(href: string) {
    onNavigate?.();
    router.push(href);
  }

  function submit() {
    const row = rows[active] ?? rows[0];
    if (!row) return;
    go(row.href);
  }

  const listOpen = value.trim().length > 0 && (rows.length > 0 || searching);
  const placeholder = t(PLACEHOLDERS[placeholderIndex] ?? "hero.placeholderLang");

  return (
    <div className={cn("relative w-full", variant === "hero" && "mx-auto max-w-2xl")}>
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
            "flex min-h-14 items-center gap-2 rounded-2xl border border-[#d5deea] bg-white py-1.5 pr-1.5 pl-3 shadow-[0_1px_0_rgba(4,115,253,0.04)] focus-within:border-primary",
            variant === "dialog" && "min-h-[3.25rem]",
          )}
        >
          <Image
            src="/brand/logo-mark-192.png"
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0"
          />
          <input
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
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

      {listOpen ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-[min(22rem,50vh)] w-full overflow-auto rounded-2xl border border-border bg-white py-1 text-left shadow-[0_12px_40px_rgba(19,30,48,0.08)]"
        >
          {rows.map((row, index) => (
            <li key={row.key} role="presentation">
              <button
                id={`${listId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(row.href)}
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
          ))}
          {searching ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("search.searching")}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
