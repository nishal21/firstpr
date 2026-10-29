import type { Metadata } from "next";
import Link from "next/link";
import { HomeBotSection } from "@/components/home-bot-section";

export const metadata: Metadata = {
  title: "FirstPRbot",
  description:
    "Install the GitHub App. Comment /firstpr explain on an issue or /firstpr review on a pull request.",
  alternates: { canonical: "/bot" },
};

const BOT_URL = "https://github.com/apps/firstprbot";

export default function BotPage() {
  return (
    <>
      <HomeBotSection />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Install FirstPRbot</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Install the GitHub App on a public repo, then comment on an issue or pull request. FirstPRbot never writes the fix.
        </p>
        <ol className="mt-8 max-w-2xl list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Install the app from GitHub and grant it the repos you want.</li>
          <li>
            On a good first issue, comment <span className="font-mono text-foreground">/firstpr explain</span>.
          </li>
          <li>
            On a pull request, comment <span className="font-mono text-foreground">/firstpr review</span>, or open a PR and wait for the score card.
          </li>
          <li>
            If nothing is posted, check that the app is installed on that repo and the comment is exactly{" "}
            <span className="font-mono text-foreground">/firstpr explain</span> or{" "}
            <span className="font-mono text-foreground">/firstpr review</span>.
          </li>
        </ol>
        <a
          href={BOT_URL}
          className="mt-8 inline-flex min-h-11 items-center font-medium text-primary hover:underline"
        >
          Install on GitHub
        </a>
        <p className="mt-6 text-sm">
          <Link href="/#match" className="text-primary hover:underline">
            Or find an issue on the site
          </Link>
        </p>
      </section>
    </>
  );
}
