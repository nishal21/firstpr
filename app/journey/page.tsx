"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useT } from "@/components/language-provider";
import { PageIntro } from "@/components/page-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { Input } from "@/components/ui/input";
import { friendlyErrorMessage } from "@/lib/api-errors";
import {
  decodeJourney,
  encodeJourney,
  readJourneySnapshot,
  recordJourney,
  sanitizeEvents,
  subscribeJourney,
  type JourneyEvent,
  type JourneyKind,
} from "@/lib/journey";
import { cn } from "@/lib/utils";

type PullState = {
  title: string;
  htmlUrl: string;
  merged: boolean;
  state: "open" | "closed";
  user: string | null;
};

function parseJourneySnapshot(raw: string): { events: JourneyEvent[]; shared: boolean } {
  if (raw.startsWith("#j=")) {
    const decoded = decodeJourney(decodeURIComponent(raw.slice(3)));
    if (decoded && decoded.length > 0) return { events: decoded, shared: true };
  }
  if (!raw) return { events: [], shared: false };
  try {
    return { events: sanitizeEvents(JSON.parse(raw) as unknown) ?? [], shared: false };
  } catch {
    return { events: [], shared: false };
  }
}

function kindLabel(kind: JourneyKind, t: ReturnType<typeof useT>): string {
  switch (kind) {
    case "match":
      return t("journey.kind.match");
    case "explain":
      return t("journey.kind.explain");
    case "review":
      return t("journey.kind.review");
    case "pr":
      return t("journey.kind.pr");
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

export default function JourneyPage() {
  const t = useT();
  const snapshot = useSyncExternalStore(subscribeJourney, readJourneySnapshot, () => "");
  const parsed = parseJourneySnapshot(snapshot);
  const events = parsed.events;
  const shared = parsed.shared;
  const [copied, setCopied] = useState(false);
  const [prUrl, setPrUrl] = useState("");
  const [prError, setPrError] = useState<string | null>(null);
  const [pr, setPr] = useState<PullState | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <PageIntro
        title={shared ? t("journey.shared") : t("journey.title")}
        subtitle={shared ? t("journey.sharedBody") : t("journey.subtitle")}
      />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        {events.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("journey.empty")}</p>
            <Link href="/#match" className={cn(arrowPillClass, "mt-4 w-full sm:w-auto")}>
              {t("hero.cta")}
              <ArrowBubble />
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {shared ? t("journey.shared") : t("journey.mine")} · {events.length}
              </p>
              {shared ? null : (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const url = `${window.location.origin}/journey#j=${encodeURIComponent(encodeJourney(events))}`;
                    void navigator.clipboard.writeText(url).then(() => setCopied(true));
                  }}
                >
                  {copied ? t("journey.copied") : t("journey.share")}
                </button>
              )}
            </div>
            <ol className="mt-4 space-y-3">
              {events.map((event) => (
                <li key={`${event.kind}-${event.href}-${event.at}`} className="border-t border-border pt-3 first:border-0 first:pt-0">
                  <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                    {kindLabel(event.kind, t)}
                  </p>
                  <a href={event.href} className="font-medium text-foreground hover:text-primary hover:underline">
                    {event.title}
                  </a>
                  {event.detail ? <p className="text-sm text-muted-foreground">{event.detail}</p> : null}
                </li>
              ))}
            </ol>
          </div>
        )}

        <form
          className="mt-8 rounded-xl border border-border bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!prUrl.trim() || pending) return;
            setPending(true);
            setPrError(null);
            void fetch(`/api/pr-status?url=${encodeURIComponent(prUrl.trim())}`)
              .then(async (res) => {
                const json = (await res.json()) as PullState & { error?: string; code?: string };
                if (!res.ok) {
                  setPr(null);
                  setPrError(friendlyErrorMessage(json.code, json.error || t("review.failed")));
                  return;
                }
                setPr(json);
                if (!shared) {
                  recordJourney({
                    kind: "pr",
                    title: json.title,
                    href: json.htmlUrl,
                    detail: json.merged ? "merged" : json.state,
                  });
                }
              })
              .catch(() => setPrError(t("review.failed")))
              .finally(() => setPending(false));
          }}
        >
          <h2 className="text-sm font-semibold">{t("journey.prLabel")}</h2>
          <label className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <Input
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder={t("journey.prPlaceholder")}
              className="min-h-11 h-11 rounded-xl"
            />
          </label>
          <button type="submit" className={cn(arrowPillClass, "mt-4")} disabled={pending}>
            {pending ? t("ready.running") : t("journey.prSubmit")}
            <ArrowBubble />
          </button>
          {prError ? <p className="mt-3 text-sm text-red-700">{prError}</p> : null}
          {pr ? (
            <p className="mt-3 text-sm">
              <a href={pr.htmlUrl} className="font-medium text-primary hover:underline">
                {pr.title}
              </a>
              {" · "}
              {pr.merged ? t("journey.merged") : pr.state === "open" ? t("journey.open") : t("journey.closed")}
            </p>
          ) : null}
        </form>
      </section>
    </>
  );
}
