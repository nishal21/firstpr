import type { Metadata } from "next";
import {
  AudienceSection,
  ContrastSection,
  FaqSection,
  FinalCta,
  HowSection,
  MobileFindBar,
  ProTeaser,
  ResearchSection,
} from "@/components/landing-sections";
import { HomeBotSection } from "@/components/home-bot-section";
import { HomeHero } from "@/components/home-hero";
import { HomeMatchSection } from "@/components/home-match-section";

export const metadata: Metadata = {
  title: "Your first open-source PR, written by you",
  description:
    "Find a real beginner issue, see the files that matter, and score your pull request before a maintainer does. FirstPR never writes the fix.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <HomeHero />
      <ContrastSection />
      <ResearchSection />
      <HowSection />
      <HomeMatchSection />
      <AudienceSection />
      <HomeBotSection />
      <ProTeaser />
      <FaqSection />
      <FinalCta />
      <MobileFindBar />
    </>
  );
}
