import { LandingSteps } from "@/components/flow-steps";
import { HomeBotSection } from "@/components/home-bot-section";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";
import { FadeUp } from "@/components/ui/words-pull-up";

export default function Home() {
  return (
    <>
      <HomeHero />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:py-14">
        <FadeUp inView>
          <LandingSteps />
        </FadeUp>
      </section>
      <HomeBotSection />
      <HomeMatchSection />
    </>
  );
}
