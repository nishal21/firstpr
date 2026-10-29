import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  title: "Credits",
  description:
    "The people, fonts, open-source libraries, and services used to build FirstPR, with links to each.",
  path: "/credits",
});

const FONTS = [
  {
    name: "Rubik Spray Paint",
    who: "NaN",
    href: "https://fonts.google.com/specimen/Rubik+Spray+Paint",
  },
  {
    name: "Inter",
    who: "Rasmus Andersson",
    href: "https://fonts.google.com/specimen/Inter",
  },
  {
    name: "IBM Plex Mono",
    who: "Mike Abbink and Bold Monday",
    href: "https://fonts.google.com/specimen/IBM+Plex+Mono",
  },
  {
    name: "Noto Sans",
    who: "Google (Malayalam, Devanagari, Tamil, Bengali, Simplified Chinese, Japanese, Korean, Arabic)",
    href: "https://fonts.google.com/noto",
  },
];

const LIBS = [
  ["Next.js", "MIT", "https://github.com/vercel/next.js"],
  ["React", "MIT", "https://github.com/facebook/react"],
  ["Tailwind CSS", "MIT", "https://github.com/tailwindlabs/tailwindcss"],
  ["Framer Motion", "MIT", "https://github.com/motiondivision/motion"],
  ["Lucide", "ISC", "https://lucide.dev"],
  ["Octokit", "MIT", "https://github.com/octokit/octokit.js"],
  ["OpenAI Node SDK", "Apache-2.0", "https://github.com/openai/openai-node"],
  ["Zod", "MIT", "https://github.com/colinhacks/zod"],
  ["Algolia JavaScript client", "MIT", "https://github.com/algolia/algoliasearch-client-javascript"],
  ["Base UI", "MIT", "https://base-ui.com"],
  ["next-themes", "MIT", "https://github.com/pacocoursey/next-themes"],
  ["Sonner", "MIT", "https://github.com/emilkowalski/sonner"],
  ["Class Variance Authority", "Apache-2.0", "https://github.com/joe-bell/cva"],
];

const INSPIRED = [
  ["footer.design animated gallery", "https://www.footer.design/styles/animated"],
  ["Baba", "https://www.callbaba.com/"],
  ["Stripe.dev", "https://stripe.dev/"],
  ["Du Meme Arts", "https://dumemearts.com/"],
  ["adxy.dev", "https://adxy.dev/"],
  ["Maggie", "https://maggie-app.com/"],
  ["Deta Surf", "https://deta.surf/"],
  ["jijo.fyi", "https://jijo.fyi/"],
  ["Mitra", "https://www.getmitra.com/"],
];

export default function CreditsPage() {
  return (
    <article className="mx-auto w-full max-w-[70ch] px-4 py-10 sm:px-6 md:py-14">
      <p className="font-plex text-xs tracking-wide text-muted-foreground">Made by Nishal K & Anan Shaji (DuoMatter)</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">Credits</h1>
      <p className="mt-4 text-base leading-relaxed">
        Names below are things this repository actually loads or calls. Nothing here is a claim that we copied a design.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Drawings</h2>
        <p className="mt-2 text-base leading-relaxed">
          The footer crowd is{" "}
          <a className="underline underline-offset-2" href="https://www.openpeeps.com/">
            Open Peeps
          </a>{" "}
          by Pablo Stanley, CC0.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Fonts</h2>
        <p className="mt-2 text-base leading-relaxed">Loaded with next/font. Each is under the SIL Open Font License.</p>
        <ul className="mt-3 space-y-2 text-base">
          {FONTS.map((font) => (
            <li key={font.name}>
              <a className="underline underline-offset-2" href={font.href}>
                {font.name}
              </a>
              {" — "}
              {font.who}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Inspired by</h2>
        <p className="mt-2 text-base leading-relaxed">
          The Merge Wall look is inspired by these sites. It is not a copy of them.
        </p>
        <ul className="mt-3 space-y-2 text-base">
          {INSPIRED.map(([name, href]) => (
            <li key={href}>
              <a className="underline underline-offset-2" href={href}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Libraries</h2>
        <ul className="mt-3 space-y-2 text-base">
          {LIBS.map(([name, license, href]) => (
            <li key={name}>
              <a className="underline underline-offset-2" href={href}>
                {name}
              </a>
              {" — "}
              {license}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Data and hosting</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed">
          <li>GitHub’s API for public issues, pull requests, and search. FirstPRbot uses the GitHub App webhook.</li>
          <li>
            Algolia, on the Algolia for Open Source plan, when the search keys are set. The index stores public issue
            fields. The “Search by Algolia” mark in the dropdown links to Algolia.
          </li>
          <li>The public site is hosted on Vercel at firstpr.nishal.dev.</li>
          <li>This version does not connect to Neon or Postgres.</li>
        </ul>
      </section>

      <p className="mt-10 text-sm">
        <Link href="/" className="underline underline-offset-2">
          Back home
        </Link>
      </p>
    </article>
  );
}
