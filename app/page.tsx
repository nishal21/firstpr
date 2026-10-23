import { LandingSteps } from "@/components/flow-steps";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";

export default function Home() {
  return (
    <>
      <HomeHero />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <LandingSteps />
      </section>
      <HomeMatchSection />
    </>
  );
}
