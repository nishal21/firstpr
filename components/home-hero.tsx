"use client";

import Image from "next/image";
import { useT } from "@/components/language-provider";
import { SiteSearch } from "@/components/site-search";

function CommitGraph() {
  return (
    <svg className="commit-graph" viewBox="0 0 720 220" aria-hidden>
      <path
        d="M18 148 C 70 146, 92 154, 140 140 S 210 112, 250 128 S 320 168, 390 132 S 470 78, 520 96 S 610 150, 700 118"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M248 126 C 280 92, 300 48, 348 42 S 430 58, 468 96"
        fill="none"
        stroke="#0473fd"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M468 96 C 490 112, 506 124, 522 96" fill="none" stroke="#0473fd" strokeWidth="5" strokeLinecap="round" />
      <circle cx="140" cy="140" r="7" fill="currentColor" />
      <circle cx="348" cy="42" r="6" fill="#0473fd" />
      <circle cx="522" cy="96" r="7" fill="#0473fd" />
      <circle cx="700" cy="118" r="6" fill="currentColor" />
      <path d="M348 48 v16" stroke="#0473fd" strokeWidth="3" strokeLinecap="round" />
      <circle cx="346" cy="70" r="2.2" fill="#0473fd" />
      <circle cx="352" cy="78" r="1.4" fill="#0473fd" />
      <path d="M140 147 v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="138" cy="164" r="1.6" fill="currentColor" />
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
