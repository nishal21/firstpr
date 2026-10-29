import { LandingSteps } from "@/components/flow-steps";
import { HomeBotSection } from "@/components/home-bot-section";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";
import { HomeMore, HomeTail } from "@/components/home-more";
import { FadeUp } from "@/components/ui/words-pull-up";
import { countOpenGoodFirstIssues } from "@/lib/github";

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
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-8">
        <FadeUp inView>
          <LandingSteps />
        </FadeUp>
      </section>
      <HomeMore />
      <HomeBotSection />
      <HomeMatchSection
        initialUser={one(sp.user)}
        initialRepo={one(sp.repo)}
        topicQuery={one(sp.q)}
        topicLang={one(sp.lang)}
      />
      <HomeTail />
    </>
  );
}
