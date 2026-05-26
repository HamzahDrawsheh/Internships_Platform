"use client";

import { LandingAboutSection } from "@/components/landing/LandingAboutSection";
import { LandingFeatureSections } from "@/components/landing/LandingFeatureSections";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeroSection } from "@/components/landing/LandingHeroSection";
import { LandingLegalSections } from "@/components/landing/LandingLegalSections";
import { landingPageClass } from "@/components/landing/landing-theme";
import { useLandingHashScroll } from "@/lib/landing/use-landing-hash-scroll";
import type { PlatformStats } from "@/lib/landing/platform-stats";

type LandingPageContentProps = {
  stats: PlatformStats;
};

export function LandingPageContent({ stats }: LandingPageContentProps) {
  useLandingHashScroll();

  return (
    <main className={landingPageClass}>
      <LandingHeroSection />
      <LandingAboutSection stats={stats} />
      <LandingFeatureSections />
      <LandingLegalSections />
      <LandingFooter />
    </main>
  );
}
