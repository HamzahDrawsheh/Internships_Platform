"use client";

import {
  landingBadgeClass,
  landingGlowBottom,
  landingGlowTop,
  landingPillarCardClass,
  landingSectionClass,
  landingStatCardClass,
} from "@/components/landing/landing-theme";
import type { PlatformStats } from "@/lib/landing/platform-stats";
import { useI18n } from "@/lib/i18n/context";

function formatStat(value: number): string {
  if (value <= 0) return "0";
  if (value < 10) return String(value);
  const step = value >= 100 ? 50 : value >= 20 ? 10 : 5;
  const floored = Math.floor(value / step) * step;
  return `${Math.max(floored, step)}+`;
}

export function LandingAboutSection({ stats }: { stats: PlatformStats }) {
  const { t } = useI18n();

  const values: Record<string, string> = {
    students: formatStat(stats.students),
    companies: formatStat(stats.companies),
    positions: formatStat(stats.positions),
    free: "100%",
  };

  const statCards = [
    {
      key: "students",
      label: t("landing.statStudents"),
      accent: "from-purple-500 to-violet-600",
      border: "border-purple-200 dark:border-purple-500/60",
      text: "text-purple-600 dark:text-purple-400",
    },
    {
      key: "companies",
      label: t("landing.statCompanies"),
      accent: "from-violet-500 to-indigo-600",
      border: "border-indigo-200 dark:border-indigo-500/60",
      text: "text-indigo-600 dark:text-indigo-400",
    },
    {
      key: "positions",
      label: t("landing.statPositions"),
      accent: "from-fuchsia-500 to-purple-600",
      border: "border-fuchsia-200 dark:border-fuchsia-500/60",
      text: "text-fuchsia-600 dark:text-fuchsia-400",
    },
    {
      key: "free",
      label: t("landing.statFree"),
      accent: "from-purple-600 to-indigo-500",
      border: "border-violet-200 dark:border-violet-500/60",
      text: "text-violet-600 dark:text-violet-300",
      staticValue: "100%",
    },
  ] as const;

  const pillars = [
    { icon: "🎯", title: t("landing.missionTitle"), body: t("landing.missionBody") },
    { icon: "🚀", title: t("landing.visionTitle"), body: t("landing.visionBody") },
    { icon: "💡", title: t("landing.valuesTitle"), body: t("landing.valuesBody") },
  ];

  return (
    <section id="about" className={`${landingSectionClass} scroll-mt-16 py-20 lg:py-24`}>
      <div className={landingGlowTop} aria-hidden />
      <div className={landingGlowBottom} aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className={landingBadgeClass}>
              <span aria-hidden>👥</span>
              {t("landing.aboutBadge")}
            </span>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#0F172A] sm:text-4xl dark:text-white">
              InternConnect{" "}
              <span className="bg-gradient-to-r from-[#7C3AED] to-[#6366F1] bg-clip-text text-transparent dark:from-purple-400 dark:to-indigo-400">
                Jordan
              </span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-400">
              {t("landing.aboutIntro")}
            </p>

            <div className="mt-8 space-y-4">
              {pillars.map((item) => (
                <article key={item.title} className={landingPillarCardClass}>
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-lg ring-1 ring-purple-100 dark:bg-gradient-to-br dark:from-purple-600/30 dark:to-indigo-600/20 dark:ring-purple-500/20"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold text-[#0F172A] dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5">
            {statCards.map((card) => (
              <article
                key={card.key}
                className={`${landingStatCardClass} ${card.border} border-t-2 border-l-2`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-[0.04] transition-opacity duration-300 group-hover:opacity-[0.08] dark:opacity-[0.07] dark:group-hover:opacity-[0.12]`}
                  aria-hidden
                />
                <p className={`relative text-3xl font-extrabold tabular-nums sm:text-4xl ${card.text}`}>
                  {"staticValue" in card ? card.staticValue : values[card.key]}
                </p>
                <p className="relative mt-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {card.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
