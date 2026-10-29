"use client";

import { useSearchParams } from "next/navigation";
import { MatchForm } from "@/components/match-form";
import { TopicIssues } from "@/components/topic-issues";
import { useT } from "@/components/language-provider";

export function HomeMatchSection({
  initialUser = "",
  initialRepo = "",
  topicQuery = "",
  topicLang = "",
}: {
  initialUser?: string;
  initialRepo?: string;
  topicQuery?: string;
  topicLang?: string;
}) {
  const t = useT();
  const sp = useSearchParams();
  const user = sp.has("user") ? (sp.get("user") ?? "") : initialUser;
  const repo = sp.has("repo") ? (sp.get("repo") ?? "") : initialRepo;
  const topic = sp.has("q") ? (sp.get("q") ?? "") : topicQuery;
  const lang = sp.has("lang") ? (sp.get("lang") ?? "") : topicLang;
  return (
    <section id="match" className="mx-auto max-w-5xl scroll-mt-20 px-4 pt-4 pb-8 sm:px-6 md:pt-6 md:pb-10">
      <p className="font-plex text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        {t("steps.step", { n: 1 })}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {t("home.matchHeading")}
      </h2>
      <p className="mt-2 mb-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("steps.match.line")}
      </p>
      {topic.trim() ? (
        <TopicIssues query={topic.trim()} language={lang.trim() || undefined} />
      ) : null}
      <MatchForm
        key={`${user}\n${repo}`}
        initialUsername={user}
        initialRepo={repo}
        autoRun={Boolean(user.trim())}
      />
    </section>
  );
}
