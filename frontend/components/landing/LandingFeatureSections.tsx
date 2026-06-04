"use client";

import { Container } from "@/components/layout/Container";
import {
  LandingFeatureIcon,
  type LandingFeatureIconName,
} from "@/components/landing/LandingFeatureIcon";
import {
  landingCardBodyClass,
  landingCardClass,
  landingCardTitleClass,
  landingGlowBottom,
  landingGlowTop,
  landingSectionClass,
  landingSectionSubtitleClass,
  landingSectionTitleClass,
  landingStepClass,
} from "@/components/landing/landing-theme";
import { useI18n } from "@/lib/i18n/context";

export function LandingFeatureSections() {
  const { t } = useI18n();

  const whyItems: { icon: LandingFeatureIconName; title: string; body: string }[] = [
    { icon: "opportunities", title: t("landing.why1Title"), body: t("landing.why1Body") },
    { icon: "applications", title: t("landing.why2Title"), body: t("landing.why2Body") },
    { icon: "updates", title: t("landing.why3Title"), body: t("landing.why3Body") },
  ];

  const howSteps = [
    { step: "1", title: t("landing.how1Title"), body: t("landing.how1Body") },
    { step: "2", title: t("landing.how2Title"), body: t("landing.how2Body") },
    { step: "3", title: t("landing.how3Title"), body: t("landing.how3Body") },
  ];

  return (
    <>
      <section id="features" className={`${landingSectionClass} scroll-mt-16 py-16 lg:py-20`}>
        <div className={landingGlowTop} aria-hidden />
        <div className={landingGlowBottom} aria-hidden />
        <Container className="relative">
          <h2 className={landingSectionTitleClass}>{t("landing.whyTitle")}</h2>
          <p className={landingSectionSubtitleClass}>{t("landing.whySubtitle")}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {whyItems.map((item) => (
              <article key={item.title} className={landingCardClass}>
                <LandingFeatureIcon name={item.icon} />
                <h3 className={landingCardTitleClass}>{item.title}</h3>
                <p className={landingCardBodyClass}>{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className={`${landingSectionClass} py-16 lg:py-20`}>
        <div className={`${landingGlowTop} left-auto right-0`} aria-hidden />
        <div className={`${landingGlowBottom} right-auto left-0`} aria-hidden />
        <Container className="relative">
          <h2 className={landingSectionTitleClass}>{t("landing.howTitle")}</h2>
          <p className={landingSectionSubtitleClass}>{t("landing.howSubtitle")}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {howSteps.map((item) => (
              <article key={item.step} className={landingCardClass}>
                <span className={landingStepClass} aria-hidden>
                  {item.step}
                </span>
                <h3 className={landingCardTitleClass}>{item.title}</h3>
                <p className={landingCardBodyClass}>{item.body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
