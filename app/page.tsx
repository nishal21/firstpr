import { LandingSteps } from "@/components/flow-steps";
import { HomeBotSection } from "@/components/home-bot-section";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";
import { FadeUp } from "@/components/ui/words-pull-up";

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

export default async function Home({ searchParams }: HomeProps) {
  const sp = await searchParams;
  return (
    <>
      <HomeHero />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14">
        <FadeUp inView>
          <LandingSteps />
        </FadeUp>
      </section>
      <HomeBotSection />
      <HomeMatchSection
        initialUser={one(sp.user)}
        initialRepo={one(sp.repo)}
        topicQuery={one(sp.q)}
        topicLang={one(sp.lang)}
      />
    </>
  );
}
