"use client";

import Link from "next/link";
import { Bot, ChevronRight } from "lucide-react";
import { useT } from "@/components/language-provider";
import { ArrowBubble } from "@/components/ui/arrow-pill";
import type { I18nKey } from "@/lib/i18n-en";

const BOT_URL = "https://github.com/apps/firstprbot";

const POINTS: { title: I18nKey; body: I18nKey }[] = [
  { title: "bot.point1Title", body: "bot.point1Body" },
  { title: "bot.point2Title", body: "bot.point2Body" },
  { title: "bot.point3Title", body: "bot.point3Body" },
];

/** Sample rows from the real comment format (lib/webhook-format.ts). */
const SAMPLE_ROWS: [string, string, string][] = [
  ["Linked issue", "Yes", "#17 Dates show in UTC"],
  ["Good first issue", "Yes", "good first issue"],
  ["Assigned to author", "Yes", "@maya-dev"],
  ["CONTRIBUTING.md", "Yes", "Branch and commits match"],
  ["Tests", "Yes", "format.test.ts added"],
  ["Scope", "Focused", "3 files, +43 −5"],
  ["First-time contributor", "Yes", "First PR to this repo"],
];

function CommentPreview() {
  const t = useT();
  return (
    <figure className="bot-preview" aria-label={t("bot.previewLabel")}>
      <div className="bot-preview-tab font-plex">
        <span className="bot-preview-pr">#42</span>
        <span className="truncate">Show dates in the user&apos;s timezone</span>
      </div>
      <div className="bot-preview-card">
        <div className="bot-preview-head">
          <span className="bot-preview-avatar" aria-hidden>
            <Bot className="size-4" />
          </span>
          <span className="font-semibold">firstprbot</span>
          <span className="bot-preview-tag font-plex">bot</span>
          <span className="bot-preview-meta font-plex">edited</span>
        </div>
        <div className="bot-preview-body">
          <p className="bot-preview-verdict">
            <span aria-hidden>✅</span> Ready for review
          </p>
          <p className="bot-preview-sub">Every check passed. (3 files, +43 −5)</p>

          <table className="bot-preview-table">
            <thead>
              <tr>
                <th scope="col">Check</th>
                <th scope="col">Result</th>
                <th scope="col" className="bot-preview-notes">Notes</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.map(([check, result, notes]) => (
                <tr key={check}>
                  <td>{check}</td>
                  <td>{result}</td>
                  <td className="bot-preview-notes">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="bot-preview-h">What a maintainer should look at</p>
          <p className="bot-preview-line">
            <code className="bot-preview-link font-plex">src/date/format.ts:48</code>
            <span>: Reads the timezone from the request now.</span>
          </p>

          <p className="bot-preview-h">For the contributor</p>
          <p className="bot-preview-line">Thanks for your first PR here. Nothing to change right now.</p>

          <p className="bot-preview-details font-plex">
            <ChevronRight className="size-3.5" aria-hidden />
            Full scoring: 94/100
          </p>
          <p className="bot-preview-foot">
            Open this PR in FirstPR · Updates on every push · FirstPRbot
          </p>
        </div>
      </div>
      <figcaption className="bot-preview-caption font-plex">{t("bot.previewCaption")}</figcaption>
    </figure>
  );
}

export function HomeBotSection() {
  const t = useT();
  return (
    <section
      className="mx-auto max-w-5xl px-4 pt-4 pb-2 sm:px-6 md:pt-6 md:pb-3"
      aria-labelledby="bot-heading"
    >
      <div className="ink-card bot-wall p-5 sm:p-8">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:items-start md:gap-10">
          <div className="min-w-0">
            <p className="bot-kicker font-plex">
              <Bot className="size-4" aria-hidden />
              {t("bot.kicker")}
            </p>
            <h2
              id="bot-heading"
              className="mt-4 text-[1.75rem] leading-tight font-semibold tracking-tight text-[var(--ink)] md:text-4xl"
            >
              {t("bot.heading")}
            </h2>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink-soft)] sm:text-base">
              {t("bot.body")}
            </p>

            <p className="font-plex mt-7 text-xs font-semibold tracking-[0.12em] text-[var(--ink)] uppercase">
              {t("bot.pointsHeading")}
            </p>
            <ol className="mt-3 grid gap-3">
              {POINTS.map((p, i) => (
                <li key={p.title} className="bot-point">
                  <span className="bot-point-num font-spray" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-[var(--ink)]">{t(p.title)}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-[var(--ink-soft)]">
                      {t(p.body)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div className="font-plex mt-6 flex flex-wrap gap-2 text-xs text-[var(--ink)] sm:text-sm">
              <span className="bot-chip">/firstpr recheck</span>
              <span className="bot-chip">/firstpr explain</span>
              <span className="bot-chip">.github/firstpr.yml</span>
            </div>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 border-[3px] border-[var(--ink)] bg-[#0473fd] px-4 text-sm font-semibold text-white shadow-[4px_4px_0_var(--shadow)] outline-none transition-[transform,box-shadow] duration-100 ease-linear active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_var(--shadow)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--ink)] sm:w-auto"
              >
                {t("footer.botLink")}
                <ArrowBubble />
              </a>
              <p className="text-center text-sm text-[var(--ink-soft)] sm:text-left">
                <Link href="/privacy" className="underline underline-offset-2">
                  {t("footer.privacy")}
                </Link>
                {" · "}
                <Link href="/terms" className="underline underline-offset-2">
                  {t("footer.terms")}
                </Link>
              </p>
            </div>
          </div>

          <CommentPreview />
        </div>
      </div>
    </section>
  );
}
