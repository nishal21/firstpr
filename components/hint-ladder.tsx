"use client";

import { useState } from "react";
import { Lock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const STEPS: { level: HintLevel; label: string }[] = [
  { level: 1, label: "Where to look" },
  { level: 2, label: "What to change" },
  { level: 3, label: "Pseudocode" },
];

const REFUSE_CHIP = "Just write the fix for me";

function lineChip(path: string, start: number, end: number): string {
  const lines = start === end ? `L${start}` : `L${start}–L${end}`;
  return `${path}:${lines}`;
}

function PointsChips({ points }: { points: HintPoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {points.map((p) => (
        <a
          key={`${p.path}:${p.start_line}-${p.end_line}`}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-blue-600 hover:bg-slate-50"
        >
          {lineChip(p.path, p.start_line, p.end_line)}
        </a>
      ))}
    </div>
  );
}

function HintCard({ stored }: { stored: StoredHint }) {
  const label = STEPS.find((s) => s.level === stored.level)?.label ?? "";
  const { payload, points } = stored;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Level {stored.level}: {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-800">{payload.hint}</p>

      {stored.level === 3 &&
      payload.pseudocode &&
      payload.pseudocode.length > 0 ? (
        <ol className="mt-3 list-decimal space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 pl-8 text-sm text-slate-800">
          {payload.pseudocode.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}

      <PointsChips points={points} />

      {payload.check_yourself ? (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Check yourself: </span>
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
  lang,
}: {
  owner: string;
  repo: string;
  number: number;
  lang?: string | null;
}) {
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

  const previousHints = STEPS.filter((s) => hints[s.level])
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
        lang: lang ?? undefined,
      }),
    });
    const json = (await res.json()) as {
      hint?: HintPayload;
      points?: HintPoint[];
      askedForCode?: boolean;
      error?: string;
    };
    if (!res.ok || !json.hint) {
      setError(json.error || "Request failed");
      return null;
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
      setError(err instanceof Error ? err.message : "Hint failed");
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
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setChatPending(false);
    }
  }

  const unlockedHints = STEPS.filter(
    (s) => unlocked >= s.level && hints[s.level],
  ).map((s) => hints[s.level]!);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Hints</h2>
      <p className="mt-1 text-sm text-slate-500">
        Three steps. FirstPR never writes the fix for you.
      </p>

      <ol className="mt-5 space-y-0">
        {STEPS.map((step, i) => {
          const isUnlocked = unlocked >= step.level;
          return (
            <li key={step.level} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={[
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                    isUnlocked
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-400",
                  ].join(" ")}
                >
                  {step.level}
                </span>
                {i < STEPS.length - 1 ? (
                  <div
                    className={[
                      "my-1 w-px flex-1 min-h-6",
                      unlocked > step.level ? "bg-blue-600" : "bg-slate-200",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
              </div>
              <div className="pb-4 pt-1.5">
                <p
                  className={[
                    "text-sm font-medium",
                    isUnlocked ? "text-slate-900" : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
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
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {hintPending ? "Thinking…" : "Show next hint"}
        </Button>
        {unlocked >= 3 ? (
          <span className="text-xs text-slate-400">All hints unlocked</span>
        ) : null}
      </div>

      {unlockedHints.length > 0 ? (
        <div className="mt-5 space-y-3">
          {unlockedHints.map((stored) => (
            <HintCard key={stored.level} stored={stored} />
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Press &quot;Show next hint&quot; to unlock where to look.
        </p>
      )}

      <div className="mt-8 space-y-2 border-t border-slate-100 pt-6">
        <label htmlFor="ask-firstpr" className="text-sm font-medium text-slate-900">
          Ask FirstPR
        </label>
        <div className="flex gap-2">
          <Input
            id="ask-firstpr"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void sendChat(ask);
            }}
            placeholder="Ask a question about the issue…"
            disabled={chatPending}
            className="rounded-xl border-slate-200"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={chatPending || !ask.trim()}
            onClick={() => void sendChat(ask)}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <button
          type="button"
          disabled={chatPending}
          onClick={() => void sendChat(REFUSE_CHIP)}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          {REFUSE_CHIP}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {messages.length > 0 ? (
        <div className="mt-5 space-y-3" aria-live="polite">
          {messages.map((msg) =>
            msg.role === "user" ? (
              <div
                key={msg.id}
                className="ml-8 rounded-xl rounded-br-sm bg-blue-600 px-4 py-2.5 text-sm text-white"
              >
                {msg.text}
              </div>
            ) : (
              <div key={msg.id} className="mr-8 space-y-2">
                <p className="text-xs font-medium text-slate-500">FirstPR</p>
                {msg.refused ? (
                  <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-4">
                    <div className="flex items-start gap-2">
                      <Lock
                        className="mt-0.5 size-4 shrink-0 text-blue-600"
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {msg.refusal_message ||
                            "I won't write the fix for you."}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-slate-700">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl rounded-bl-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800">
                    {msg.text}
                  </div>
                )}
                <PointsChips points={msg.points} />
                {msg.check_yourself ? (
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-800">
                      Check yourself:{" "}
                    </span>
                    {msg.check_yourself}
                  </p>
                ) : null}
              </div>
            ),
          )}
          {chatPending ? (
            <p className="text-sm text-slate-400">FirstPR is thinking…</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
