"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LangToggle } from "@/components/LangToggle";
import { useT } from "@/components/language-provider";
import { arrowPillClass } from "@/components/ui/arrow-pill";
import { cn } from "@/lib/utils";

type FreshIssue = {
  owner: string;
  repo: string;
  number: number;
  title: string;
  labels?: string[];
};

const WALK = [
  {
    id: "find",
    kicker: "1 · Find",
    title: "Match an open issue",
    body: "Match reads a GitHub username and optional repo, then lists open good-first issues with no assignee. The public example used on this site is nishal21/NekoDroid.",
    href: "/#match",
    hrefLabel: "Open match",
  },
  {
    id: "understand",
    kicker: "2 · Understand",
    title: "Read the real files",
    body: "Explain summarizes issue #4 and cites files that exist in that repo. It does not invent a patch.",
    href: "/issue/nishal21/NekoDroid/4",
    hrefLabel: "Open NekoDroid #4",
  },
  {
    id: "write",
    kicker: "3 · Write it yourself",
    title: "You make the change",
    body: "FirstPR stops here. It does not write the fix, commit it, or open a pull request.",
  },
  {
    id: "review",
    kicker: "4 · Review",
    title: "Score a pull request",
    body: "Review scores a PR URL or a pasted diff against the issue, CONTRIBUTING.md, and the change. The sample on the review page is the public PR nishal21/NekoDroid#7.",
    href: "/review?pr=https%3A%2F%2Fgithub.com%2Fnishal21%2FNekoDroid%2Fpull%2F7",
    hrefLabel: "Open that review",
  },
] as const;

const NEVER = [
  "Write your code, a commit message, or a patch.",
  "Open, push, or merge a pull request for you.",
  "Replace the maintainer’s review.",
];

const FAQ = [
  {
    q: "Does FirstPR write the fix?",
    a: "No. Explain and the hint ladder are written to refuse code-for-me requests. You edit the repo yourself.",
  },
  {
    q: "Which repos can it read?",
    a: "Public GitHub repositories. Private repos are not part of this app.",
  },
  {
    q: "Do I need an account?",
    a: "No. There is no login. Match asks for a GitHub username so it can look up public languages and issues.",
  },
  {
    q: "What does FirstPRbot do?",
    a: "On a repo where the GitHub App is installed, /firstpr explain on an issue posts a guide, and /firstpr review on a pull request posts a score card. Opening or updating a PR can post that card too. The bot does not write the fix.",
  },
  {
    q: "Where does my text go?",
    a: "Issue and PR text needed for explain, hints, difficulty, and review is sent to the model provider configured on the server (OpenAI by default, optional Neysa endpoints for file picking). See the privacy page for the full list.",
  },
];

export function HomeMore() {
  const t = useT();
  return (
    <>
      <FreshIssues title={t("home.freshTitle")} />
      <Walkthrough title={t("home.walkTitle")} />
      <NeverList title={t("home.neverTitle")} />
    </>
  );
}

export function HomeTail() {
  const t = useT();
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{t("home.langTitle")}</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          The interface is written in English, Malayalam, and Hindi. Other languages in the menu use English where a line has not been translated. The switch is stored in this browser.
        </p>
        <div className="mt-4">
          <LangToggle buttonClassName="sticker-pill" />
        </div>
      </section>
      <Faq title={t("home.faqTitle")} />
      <Oss title={t("home.ossTitle")} />
      <section className="mx-auto max-w-5xl px-4 pt-2 pb-8 sm:px-6">
        <div className="ink-card flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-[#16140f] md:text-3xl">
            {t("home.ctaTitle")}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/#match" className={arrowPillClass}>
              {t("home.ctaMatch")}
            </Link>
            <Link href="/review" className={cn(arrowPillClass, "bg-[#16140f]")}>
              {t("home.ctaReview")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FreshIssues({ title }: { title: string }) {
  const [state, setState] = useState<"load" | "ok" | "hide">("load");
  const [issues, setIssues] = useState<FreshIssue[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/search?q=good%20first%20issue", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("search");
        const json = (await res.json()) as { issues?: FreshIssue[]; error?: string };
        if (json.error || !Array.isArray(json.issues) || json.issues.length === 0) {
          throw new Error("empty");
        }
        setIssues(json.issues.slice(0, 4));
        setState("ok");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState("hide");
      });
    return () => controller.abort();
  }, []);

  if (state === "hide") return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6" aria-busy={state === "load"}>
      <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{title}</h2>
      {state === "load" ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="ink-card h-24 p-4">
              <div className="search-skel h-3 w-2/3" />
              <div className="search-skel mt-3 h-3 w-1/3" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {issues.map((issue) => {
            const href = `/issue/${encodeURIComponent(issue.owner)}/${encodeURIComponent(issue.repo)}/${issue.number}`;
            return (
              <li key={href}>
                <Link href={href} className="ink-card block p-4 text-[#16140f] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0473fd]">
                  <p className="font-plex text-[11px] tracking-wide text-[#3f3a32]">
                    {issue.owner}/{issue.repo}#{issue.number}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{issue.title}</p>
                  {issue.labels && issue.labels.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {issue.labels.slice(0, 2).map((label) => (
                        <span key={label} className="border border-[#16140f] px-1.5 py-0.5 text-[10px] font-medium">
                          {label}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Walkthrough({ title }: { title: string }) {
  const [active, setActive] = useState(0);
  const step = WALK[active] ?? WALK[0];

  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{title}</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[16rem_1fr]">
        <div className="flex gap-2 overflow-x-auto md:flex-col" role="tablist" aria-label={title}>
          {WALK.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={cn(
                "shrink-0 border-[3px] border-[#16140f] px-3 py-2 text-left text-sm font-semibold shadow-[3px_3px_0_#16140f] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0473fd]",
                index === active ? "bg-[#0473fd] text-white" : "bg-[#fffdf8] text-[#16140f]",
              )}
              onClick={() => setActive(index)}
            >
              <span className="font-plex block text-[10px] tracking-[0.14em] uppercase opacity-80">{item.kicker}</span>
              {item.title}
            </button>
          ))}
        </div>
        <div className="ink-card p-5" role="tabpanel">
          <p className="text-sm leading-relaxed text-[#3f3a32]">{step.body}</p>
          {"href" in step && step.href ? (
            <Link href={step.href} className={cn(arrowPillClass, "mt-4")}>
              {step.hrefLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function NeverList({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{title}</h2>
      <ul className="mt-4 grid gap-3">
        {NEVER.map((item) => (
          <li key={item} className="ink-card px-4 py-3 text-base font-semibold text-[#16140f]">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq({ title }: { title: string }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{title}</h2>
      <div className="mt-4 grid gap-3">
        {FAQ.map((item, index) => {
          const on = open === index;
          const panelId = `faq-panel-${index}`;
          return (
            <div key={item.q} className="ink-card p-0">
              <h3>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base font-semibold text-[#16140f] outline-none focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#0473fd]"
                  aria-expanded={on}
                  aria-controls={panelId}
                  onClick={() => setOpen(on ? null : index)}
                >
                  {item.q}
                  <span className="font-plex text-xs" aria-hidden>
                    {on ? "−" : "+"}
                  </span>
                </button>
              </h3>
              <div id={panelId} role="region" hidden={!on} className="px-4 pb-4 text-sm leading-relaxed text-[#3f3a32]">
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Oss({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <h2 className="font-spray text-3xl text-foreground sm:text-4xl">{title}</h2>
      <div className="ink-card mt-4 p-5 text-sm leading-relaxed text-[#3f3a32]">
        <p>
          The source is AGPL-3.0. Copyright 2026 Nishal K and Anan Shaji (NKcodex / DuoMatter). A separate commercial license is offered by contacting nishal@nishal.dev. That commercial text is not in this repository.
        </p>
        <p className="mt-3">
          This version does not connect to Postgres or Neon. Server cache is memory inside the Node process and expires after about ten minutes. Self-hosting means Node, the env keys in <span className="font-plex">.env.example</span>, and a public URL if you run FirstPRbot.
        </p>
        <p className="mt-4 flex flex-wrap gap-3">
          <a className={arrowPillClass} href="https://github.com/nishal21/firstpr">
            Source on GitHub
          </a>
          <Link className={cn(arrowPillClass, "bg-[#16140f]")} href="/privacy">
            Privacy
          </Link>
          <Link className={cn(arrowPillClass, "bg-[#16140f]")} href="/terms">
            Terms
          </Link>
        </p>
      </div>
    </section>
  );
}
