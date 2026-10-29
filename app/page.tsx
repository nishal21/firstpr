import { Suspense } from "react";
import { LandingSteps } from "@/components/flow-steps";
import { HomeBotSection } from "@/components/home-bot-section";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";
import { HomeMore, HomeTail } from "@/components/home-more";
import { FadeUp } from "@/components/ui/words-pull-up";
import { JsonLd } from "@/components/json-ld";
import { countOpenGoodFirstIssues } from "@/lib/github";
import { pageMetadata } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, WHAT_IS } from "@/lib/site";
import { faqPage, howTo } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: `${SITE_NAME}: find, understand, and review your first open-source PR`,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

type HomeProps = {
  searchParams: Promise<{
    user?: string | string[];
    repo?: string | string[];
    q?: string | string[];
    lang?: string | string[];
  }>;
};

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function loadOpenCount(): Promise<number | null> {
  try {
    return await countOpenGoodFirstIssues();
  } catch {
    return null;
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  const openIssues = await loadOpenCount();
  return (
    <>
      <HomeHero openIssues={openIssues} />
      <section aria-labelledby="what-is-firstpr" className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 md:pt-8">
        <h2 id="what-is-firstpr" className="font-plex text-xs tracking-wide text-foreground/70 uppercase">
          What is FirstPR?
        </h2>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-foreground sm:text-lg">{WHAT_IS}</p>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
        <FadeUp inView>
          <LandingSteps />
        </FadeUp>
      </section>
      <HomeMore />
      <HomeBotSection />
      <Suspense fallback={null}>
        <HomeMatchSection
          initialUser={one(sp.user)}
          initialRepo={one(sp.repo)}
          topicQuery={one(sp.q)}
          topicLang={one(sp.lang)}
        />
      </Suspense>
      <HomeTail />
      <JsonLd data={[faqPage(), howTo()]} />
    </>
  );
}
