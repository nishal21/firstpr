"use client";

import { useState } from "react";
import { Lock, Send } from "lucide-react";
import { useT } from "@/components/language-provider";
import { SavedResultDot } from "@/components/saved-result-dot";
import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyErrorMessage } from "@/lib/api-errors";
import type { I18nKey } from "@/lib/i18n";

type HintLevel = 1 | 2 | 3;

type HintPoint = {
  path: string;
  start_line: number;
  end_line: number;
  url: string;
};

type HintPayload = {
  refused: boolean;
  refusal_message: string | null;
  level: HintLevel;
  hint: string;
  pseudocode: string[] | null;
  points_to: { path: string; start_line: number; end_line: number }[];
  check_yourself: string;
};

type StoredHint = {
  level: HintLevel;
  payload: HintPayload;
  points: HintPoint[];
};

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      refused: boolean;
      refusal_message: string | null;
      points: HintPoint[];
      check_yourself: string | null;
    };

const STEP_KEYS: { level: HintLevel; labelKey: I18nKey }[] = [
  { level: 1, labelKey: "hint.where" },
  { level: 2, labelKey: "hint.what" },
  { level: 3, labelKey: "hint.pseudo" },
];

function lineChip(path: string, start: number, end: number): string {
  const lines = start === end ? `L${start}` : `L${start}–L${end}`;
  return `${path}:${lines}`;
}

function PointsChips({ points }: { points: HintPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="mt-3 flex max-w-full flex-wrap gap-2">
      {points.map((p) => (
        <a
          key={`${p.path}:${p.start_line}-${p.end_line}`}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full min-h-11 items-center overflow-x-auto rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-primary hover:bg-muted"
        >
          <span className="truncate sm:whitespace-normal sm:break-all">
            {lineChip(p.path, p.start_line, p.end_line)}
          </span>
        </a>
      ))}
    </div>
  );
}

function HintCard({
  stored,
  t,
}: {
  stored: StoredHint;
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
}) {
  const labelKey =
    STEP_KEYS.find((s) => s.level === stored.level)?.labelKey ?? "hint.where";
  const { payload, points } = stored;

  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("hint.level", { n: stored.level, label: t(labelKey) })}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground break-words">
        {payload.hint}
      </p>

      {stored.level === 3 &&
      payload.pseudocode &&
      payload.pseudocode.length > 0 ? (
        <ol className="mt-3 list-decimal space-y-1.5 rounded-lg border border-border bg-card p-3 pl-8 text-sm text-foreground">
          {payload.pseudocode.map((step) => (
            <li key={step} className="break-words">
              {step}
            </li>
          ))}
        </ol>
      ) : null}

      <PointsChips points={points} />

      {payload.check_yourself ? (
        <p className="mt-3 text-sm text-muted-foreground break-words">
          <span className="font-medium text-foreground">
            {t("hint.checkYourself")}{" "}
          </span>
          {payload.check_yourself}
        </p>
      ) : null}
    </div>
  );
}

export function HintLadder({
  owner,
  repo,
  number,
}: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}) {
  const t = useT();
  const refuseChip = t("hint.refuseChip");
  /** Filled only by "Show next hint" (Hints route, no chat overwrite). */
  const [hints, setHints] = useState<Partial<Record<HintLevel, StoredHint>>>(
    {},
  );
  const [unlocked, setUnlocked] = useState(0);

  /** Filled only by Ask FirstPR / refuse chip. Never written into hints. */
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ask, setAsk] = useState("");

  const [hintPending, setHintPending] = useState(false);
  const [chatPending, setChatPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const previousHints = STEP_KEYS.filter((s) => hints[s.level])
    .map((s) => hints[s.level]!.payload.hint)
    .filter(Boolean);

  async function callHintApi(opts: {
    level: HintLevel;
    userMessage: string | null;
  }): Promise<{
    hint: HintPayload;
    points: HintPoint[];
    askedForCode: boolean;
  } | null> {
    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner,
        repo,
        number,
        level: opts.level,
        userMessage: opts.userMessage,
        previousHints,
      }),
    });
    const json = (await res.json()) as {
      hint?: HintPayload;
      points?: HintPoint[];
      askedForCode?: boolean;
      error?: string;
      code?: string;
    };
    if (!res.ok || !json.hint) {
      setError(
        friendlyErrorMessage(json.code, json.error || t("hint.requestFailed")),
      );
      return null;
    }
    if (res.headers.get("x-firstpr-source") === "cache") {
      setFromCache(true);
    }
    return {
      hint: json.hint,
      points: json.points ?? [],
      askedForCode: Boolean(json.askedForCode),
    };
  }

  async function unlockNextHint() {
    if (hintPending || unlocked >= 3) return;
    const target = (unlocked + 1) as HintLevel;
    if (hints[target]) {
      setUnlocked(target);
      return;
    }

    setHintPending(true);
    setError(null);
    try {
      const result = await callHintApi({ level: target, userMessage: null });
      if (!result) return;
      setHints((prev) => ({
        ...prev,
        [target]: {
          level: target,
          payload: { ...result.hint, refused: false, refusal_message: null },
          points: result.points,
        },
      }));
      setUnlocked(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hint.failed"));
    } finally {
      setHintPending(false);
    }
  }

  async function sendChat(message: string) {
    const text = message.trim();
    if (!text || chatPending) return;

    const userId = `u-${Date.now()}`;
    setAsk("");
    setMessages((prev) => [...prev, { id: userId, role: "user", text }]);
    setChatPending(true);
    setError(null);

    // Use current unlocked level for context only — never write into hints[].
    const level = (unlocked > 0 ? unlocked : 1) as HintLevel;

    try {
      const result = await callHintApi({ level, userMessage: text });
      if (!result) return;

      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          text: result.hint.hint,
          refused: result.hint.refused || result.askedForCode,
          refusal_message: result.hint.refusal_message,
          points: result.points,
          check_yourself: result.hint.check_yourself || null,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hint.askFailed"));
    } finally {
      setChatPending(false);
    }
  }

  const unlockedHints = STEP_KEYS.filter(
    (s) => unlocked >= s.level && hints[s.level],
  ).map((s) => hints[s.level]!);

  return (
    <div className="relative min-w-0 rounded-xl border border-border bg-card p-5">
      <SavedResultDot show={fromCache} />
      <h2 className="text-sm font-semibold text-foreground">{t("hint.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("hint.subtitle")}</p>

      <ol className="mt-5 space-y-0">
        {STEP_KEYS.map((step, i) => {
          const isUnlocked = unlocked >= step.level;
          return (
            <li key={step.level} className="flex min-w-0 gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                    isUnlocked
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {step.level}
                </span>
                {i < STEP_KEYS.length - 1 ? (
                  <div
                    className={[
                      "my-1 w-px flex-1 min-h-6",
                      unlocked > step.level ? "bg-primary" : "bg-border",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className="min-w-0 pb-4 pt-1.5">
                <p
                  className={[
                    "text-sm font-medium break-words",
                    isUnlocked ? "text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {t(step.labelKey)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => void unlockNextHint()}
          disabled={hintPending || unlocked >= 3}
          className="min-h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/40"
        >
          {hintPending ? (
            <>
              <Spinner className="text-primary-foreground" />
              {t("hint.loading")}
            </>
          ) : (
            t("hint.showNext")
          )}
        </Button>
        {unlocked >= 3 ? (
          <span className="text-xs text-muted-foreground">
            {t("hint.allUnlocked")}
          </span>
        ) : null}
      </div>

      {unlockedHints.length > 0 ? (
        <div className="mt-5 space-y-3">
          {unlockedHints.map((stored) => (
            <HintCard key={stored.level} stored={stored} t={t} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">{t("hint.pressNext")}</p>
      )}

      <div className="mt-8 space-y-2 border-t border-border pt-6">
        <label
          htmlFor="ask-firstpr"
          className="text-sm font-medium text-foreground"
        >
          {t("hint.askTitle")}
        </label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="ask-firstpr"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendChat(ask);
            }}
            placeholder={t("hint.askPlaceholder")}
            disabled={chatPending}
            className="min-h-11 h-11 min-w-0 flex-1 rounded-xl border-border focus-visible:border-primary focus-visible:ring-ring/30"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={chatPending || !ask.trim()}
            onClick={() => void sendChat(ask)}
            aria-label={t("hint.send")}
            className="size-11 shrink-0 rounded-xl border-border focus-visible:ring-ring/40"
          >
            {chatPending ? <Spinner /> : <Send className="size-4" />}
          </Button>
        </div>
        <button
          type="button"
          disabled={chatPending}
          onClick={() => void sendChat(refuseChip)}
          className="inline-flex min-h-11 items-center rounded-full border border-border bg-muted px-3 py-2 text-sm text-foreground hover:bg-muted/80 disabled:opacity-50"
        >
          {refuseChip}
        </button>
      </div>

      {error ? (
        <div className="mt-4 space-y-2" role="alert">
          <p className="text-sm text-red-600 break-words">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 rounded-xl border-border"
            onClick={() => void unlockNextHint()}
          >
            {t("explain.retry")}
          </Button>
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="mt-5 space-y-3" aria-live="polite">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                className="ml-4 break-words rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground sm:ml-8"
              >
                {msg.text}
              </div>
            ) : (
              <div key={msg.id} className="mr-4 min-w-0 space-y-2 sm:mr-8">
                <p className="text-xs font-medium text-muted-foreground">
                  FirstPR
                </p>
                {msg.refused ? (
                  <div className="rounded-xl border border-border border-l-4 border-l-primary bg-card p-4">
                    <div className="flex min-w-0 items-start gap-2">
                      <Lock
                        className="mt-0.5 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground break-words">
                          {msg.refusal_message || t("hint.wontWrite")}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground break-words">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="break-words rounded-xl rounded-bl-sm border border-border bg-muted px-4 py-2.5 text-sm text-foreground">
                    {msg.text}
                  </div>
                )}
                <PointsChips points={msg.points} />
                {msg.check_yourself ? (
                  <p className="text-sm text-muted-foreground break-words">
                    <span className="font-medium text-foreground">
                      {t("hint.checkYourself")}{" "}
                    </span>
                    {msg.check_yourself}
                  </p>
                ) : null}
              </div>
            ),
          )}
          {chatPending ? (
            <p className="text-sm text-muted-foreground">{t("hint.thinking")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
