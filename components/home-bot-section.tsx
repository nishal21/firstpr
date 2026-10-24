"use client";

import { useT } from "@/components/language-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BOT_URL = "https://github.com/apps/firstprbot";

export function HomeBotSection() {
  const t = useT();
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
            {t("bot.heading")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("bot.body")}
          </p>
        </div>
        <a
          href={BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "inline-flex h-11 min-h-11 shrink-0 items-center justify-center rounded-xl border-border px-5",
          )}
        >
          {t("bot.cta")}
        </a>
      </div>
    </section>
  );
}
