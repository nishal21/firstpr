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
  askedForCode: boolean;
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
  const [unlocked, setUnlocked] = useState(0);
  const [active, setActive] = useState<HintLevel | null>(null);
  const [byLevel, setByLevel] = useState<Partial<Record<HintLevel, StoredHint>>>(
    {},
  );
  const [ask, setAsk] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previousHints = STEPS.filter((s) => byLevel[s.level])
    .map((s) => byLevel[s.level]!.payload.hint)
    .filter(Boolean);

  async function fetchHint(level: HintLevel, userMessage: string | null) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          number,
          level,
          userMessage,
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
        setError(json.error || "Hint failed");
        return;
      }
      const stored: StoredHint = {
        level,
        payload: json.hint,
        points: json.points ?? [],
        askedForCode: Boolean(json.askedForCode),
      };
      setByLevel((prev) => ({ ...prev, [level]: stored }));
      setUnlocked((u) => Math.max(u, level));
      setActive(level);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hint failed");
    } finally {
      setPending(false);
    }
  }

  function showNext() {
    if (pending || unlocked >= 3) return;
    const target = (unlocked + 1) as HintLevel;
    if (byLevel[target]) {
      setUnlocked(target);
      setActive(target);
      return;
    }
    void fetchHint(target, null);
  }

  function onSend(message: string) {
    const text = message.trim();
    if (!text || pending) return;
    const level = (unlocked > 0 ? unlocked : 1) as HintLevel;
    setAsk("");
    void fetchHint(level, text);
  }

  const current = active != null ? byLevel[active] : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">Hints</h2>
      <p className="mt-1 text-sm text-slate-500">
        Three steps. FirstPR never writes the fix for you.
      </p>

      <ol className="mt-5 space-y-0">
        {STEPS.map((step, i) => {
          const isUnlocked = unlocked >= step.level;
          const isActive = active === step.level;
          return (
            <li key={step.level} className="flex gap-3">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isUnlocked || pending}
                  onClick={() => isUnlocked && setActive(step.level)}
                  className={[
                    "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                    isActive
                      ? "bg-blue-600 text-white"
                      : isUnlocked
                        ? "border border-blue-600 text-blue-600 hover:bg-blue-50"
                        : "border border-slate-200 text-slate-400",
                  ].join(" ")}
                  aria-current={isActive ? "step" : undefined}
                >
                  {step.level}
                </button>
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
              <div className="pb-4 pt-1">
                <button
                  type="button"
                  disabled={!isUnlocked || pending}
                  onClick={() => isUnlocked && setActive(step.level)}
                  className={[
                    "text-left text-sm font-medium",
                    isUnlocked ? "text-slate-900" : "text-slate-400",
                  ].join(" ")}
                >
                  {step.label}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={showNext}
          disabled={pending || unlocked >= 3}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {pending ? "Thinking…" : "Show next hint"}
        </Button>
        {unlocked >= 3 ? (
          <span className="text-xs text-slate-400">All hints unlocked</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-2">
        <label htmlFor="ask-firstpr" className="text-sm font-medium text-slate-900">
          Ask FirstPR
        </label>
        <div className="flex gap-2">
          <Input
            id="ask-firstpr"
            value={ask}
            onChange={(e) => setAsk(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSend(ask);
            }}
            placeholder="Ask a question about the issue…"
            disabled={pending}
            className="rounded-xl border-slate-200"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={pending || !ask.trim()}
            onClick={() => onSend(ask)}
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSend(REFUSE_CHIP)}
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

      {current ? (
        <div className="mt-5 space-y-3">
          {current.payload.refused ? (
            <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-4">
              <div className="flex items-start gap-2">
                <Lock
                  className="mt-0.5 size-4 shrink-0 text-blue-600"
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {current.payload.refusal_message ||
                      "I won't write the fix for you."}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700">
                    {current.payload.hint}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Level {current.level}:{" "}
                {STEPS.find((s) => s.level === current.level)?.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-800">
                {current.payload.hint}
              </p>
            </div>
          )}

          {current.payload.pseudocode &&
          current.payload.pseudocode.length > 0 ? (
            <ol className="list-decimal space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 pl-8 text-sm text-slate-800">
              {current.payload.pseudocode.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}

          {current.points.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {current.points.map((p) => (
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
          ) : null}

          {current.payload.check_yourself ? (
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">Check yourself: </span>
              {current.payload.check_yourself}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">
          Press &quot;Show next hint&quot; to unlock where to look, or ask
          FirstPR a question.
        </p>
      )}
    </div>
  );
}
