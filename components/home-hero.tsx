"use client";

import Image from "next/image";
import { useT } from "@/components/language-provider";
import { SiteSearch } from "@/components/site-search";

function CommitGraph() {
  return (
    <svg className="commit-graph" viewBox="0 0 720 130" aria-hidden>
      <path
        d="M16 86 L108 82 L214 90 L330 78 L456 88 L572 80 L700 86"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M214 90 C232 90 236 38 268 34 L392 30 C430 28 448 70 456 88"
        fill="none"
        stroke="#0473fd"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="108" cy="82" r="5.5" fill="currentColor" />
      <circle cx="214" cy="90" r="5.5" fill="currentColor" />
      <circle cx="330" cy="78" r="5.5" fill="currentColor" />
      <circle cx="572" cy="80" r="5.5" fill="currentColor" />
      <circle cx="700" cy="86" r="5.5" fill="currentColor" />
      <circle cx="268" cy="34" r="5" fill="#0473fd" />
      <circle cx="392" cy="30" r="5" fill="#0473fd" />
      <circle cx="456" cy="88" r="7" fill="#0473fd" />
      <path d="M214 96 v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="213" cy="108" r="1.6" fill="currentColor" />
      <path d="M268 40 v8" stroke="#0473fd" strokeWidth="2" strokeLinecap="round" />
      <circle cx="269" cy="51" r="1.4" fill="#0473fd" />
    </svg>
  );
}

export function HomeHero({ openIssues }: { openIssues: number | null }) {
  const t = useT();
  const count =
    typeof openIssues === "number" ? new Intl.NumberFormat("en-US").format(openIssues) : null;

  return (
    <section className="merge-hero">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 pb-10 sm:px-6 md:pt-14 md:pb-16">
        <div className="flex items-end gap-3 sm:gap-5">
          <div className="cat-tag" aria-hidden>
            <Image
              src="/brand/logo-mark-512.png"
              alt=""
              width={160}
              height={160}
              priority
              className="cat-tag-mark"
            />
          </div>
          <h1 className="font-spray min-w-0 text-[2.15rem] leading-[0.9] text-foreground sm:text-6xl md:text-7xl">
            <span className="block">{t("hero.sprayLead")}</span>
            <span className="mt-1 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="spray-strike">{t("hero.sprayStruck")}</span>
              <span>{t("hero.sprayEnd")}</span>
            </span>
          </h1>
        </div>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground/80 sm:text-lg">
          {t("hero.sub")}
        </p>
        <div className="relative mt-2 pt-24 sm:pt-28">
          <CommitGraph />
          <SiteSearch />
        </div>
        {count ? (
          <p className="font-plex mt-4 text-xs tracking-wide text-foreground/70">{t("hero.statusCount", { count })}</p>
        ) : null}
      </div>
    </section>
  );
}
