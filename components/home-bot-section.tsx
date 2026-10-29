"use client";

import { Bot, GitPullRequestArrow, MessageSquareText } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ArrowBubble } from "@/components/ui/arrow-pill";

const BOT_URL = "https://github.com/apps/firstprbot";

export function HomeBotSection() {
  const t = useT();
  return (
    <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
      <div className="ink-card p-6 sm:p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="min-w-0 max-w-xl">
            <span className="inline-flex size-11 items-center justify-center border-2 border-[#16140f] bg-[#0473fd] text-white">
              <Bot className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#16140f] md:text-3xl">
              {t("bot.heading")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#3f3a32] sm:text-base">{t("bot.body")}</p>
            <div className="font-plex mt-5 flex flex-wrap gap-2 text-xs text-[#16140f] sm:text-sm">
              <span className="inline-flex items-center gap-1.5 border-2 border-[#16140f] bg-[#fffdf8] px-2.5 py-1.5 shadow-[2px_2px_0_#16140f]">
                <MessageSquareText className="size-3.5 text-[#0473fd]" aria-hidden />
                /firstpr explain
              </span>
              <span className="inline-flex items-center gap-1.5 border-2 border-[#16140f] bg-[#fffdf8] px-2.5 py-1.5 shadow-[2px_2px_0_#16140f]">
                <GitPullRequestArrow className="size-3.5 text-[#0473fd]" aria-hidden />
                /firstpr review
              </span>
            </div>
          </div>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 border-[3px] border-[#16140f] bg-[#0473fd] px-4 text-sm font-semibold text-white shadow-[4px_4px_0_#16140f] outline-none transition-[transform,box-shadow] duration-100 ease-linear active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_#16140f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#16140f] sm:w-auto"
          >
            {t("bot.cta")}
            <ArrowBubble />
          </a>
        </div>
      </div>
    </section>
  );
}
