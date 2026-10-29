"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSearch, ListChecks, MapPin, ScanSearch } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ToolIntro } from "@/components/tool-intro";
import { ArrowBubble, arrowPillClass } from "@/components/ui/arrow-pill";
import { Input } from "@/components/ui/input";
import { issuePath, type IssueRef } from "@/lib/issue-path";
import { parseGitHubInput } from "@/lib/parse-github-input";
import { cn } from "@/lib/utils";

const EXAMPLE = "nishal21/NekoDroid#4";

/** An issue link, owner/repo#N, or owner/repo/issues/N. PR links come back as "pull". */
function readIssueRef(raw: string): IssueRef | "pull" | null {
  const text = raw.trim();
  const short = text.match(/^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9_.-]{1,100})(?:#|\/issues\/)(\d{1,9})$/);
  if (short) return { owner: short[1], repo: short[2], number: Number(short[3]) };
  const parsed = parseGitHubInput(text);
  if (parsed.kind === "issue") return { owner: parsed.owner, repo: parsed.repo, number: parsed.number };
  if (parsed.kind === "pull") return "pull";
  return null;
}

export function ExplainEntry() {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<"invalid" | "pull" | null>(null);

  function submit() {
    const ref = readIssueRef(value);
    if (ref === "pull") return setProblem("pull");
    if (!ref) return setProblem("invalid");
    setProblem(null);
    router.push(issuePath(ref));
  }

  return (
    <>
      <ToolIntro
        icon={ScanSearch}
        step={`${t("steps.step", { n: 2 })} · ${t("nav.explain")}`}
        title={t("explain.entryTitle")}
        subtitle={t("explain.entryLead")}
        chipsLabel={t("explain.getsLabel")}
        chips={[
          { icon: FileSearch, label: t("explain.getSummary") },
          { icon: MapPin, label: t("explain.getFiles") },
          { icon: ListChecks, label: t("explain.getChecklist") },
        ]}
      />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <form
          className="ink-card min-w-0 p-4 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="block text-sm font-semibold text-foreground">
            {t("explain.entryLabel")}
            <Input
              className="sticker-field mt-1.5 min-h-11 h-11 w-full rounded-none text-base md:text-sm"
              placeholder={t("explain.entryPlaceholder")}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setProblem(null);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={problem ? true : undefined}
            />
          </label>
          {problem ? (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {problem === "pull" ? t("explain.entryIsPull") : t("explain.entryInvalid")}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" className={cn(arrowPillClass, "w-full sm:w-auto")} disabled={!value.trim()}>
              {t("explain.entrySubmit")}
              <ArrowBubble />
            </button>
            <p className="text-sm text-foreground/70">
              {t("explain.entryExample")}{" "}
              <button
                type="button"
                className="inline-flex min-h-11 items-center font-mono text-primary hover:underline"
                onClick={() => {
                  setValue(EXAMPLE);
                  setProblem(null);
                }}
              >
                {EXAMPLE}
              </button>
            </p>
          </div>
        </form>
      </section>
    </>
  );
}
