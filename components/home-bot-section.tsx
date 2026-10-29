"use client";

import { Bot, GitPullRequestArrow, MessageSquareText } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ArrowBubble } from "@/components/ui/arrow-pill";

const BOT_URL = "https://github.com/apps/firstprbot";

export function HomeBotSection() {
  const t = useT();
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <div className="relative overflow-hidden rounded-2xl bg-[#0f1828] p-6 text-slate-100 sm:p-8 md:rounded-3xl md:p-10">
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0 max-w-xl">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
              <Bot className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t("bot.heading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              {t("bot.body")}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 font-mono text-xs text-slate-200 sm:text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
                <MessageSquareText className="size-3.5 text-primary" aria-hidden />
                /firstpr explain
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/10">
                <GitPullRequestArrow className="size-3.5 text-primary" aria-hidden />
                /firstpr review
              </span>
            </div>
            <div className="mt-6 max-w-md space-y-2 text-sm" aria-label={t("bot.exampleLabel")}>
              <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 uppercase">
                {t("bot.exampleLabel")}
              </p>
              <p className="rounded-xl bg-white/10 px-3 py-2 font-mono text-slate-100">/firstpr explain</p>
              <p className="rounded-xl bg-white px-3 py-3 text-slate-700">
                Look at <span className="font-mono text-xs">src/filter.tsx</span> lines 40–58.
                Done when the menu opens from the keyboard. FirstPRbot will not write the patch.
              </p>
            </div>
          </div>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-11 w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:justify-center rounded-full bg-white py-1 pr-1 pl-5 text-sm font-medium text-[#0f1828] outline-none transition-all hover:gap-3 focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {t("bot.cta")}
            <ArrowBubble className="bg-primary" iconClassName="text-white" />
          </a>
        </div>
      </div>
    </section>
  );
}
