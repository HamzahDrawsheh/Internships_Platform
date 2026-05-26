"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { CompanyHintSlideContent } from "@/components/dashboard/company/CompanyHintSlideContent";
import { buildGrowListingsSlides } from "@/lib/dashboard/company-dashboard-hints";
import type { CompanyDashboardSnapshot } from "@/lib/dashboard/load-company-dashboard-snapshot";
import { findTopListing } from "@/lib/dashboard/load-company-dashboard-snapshot";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type Props = {
  snapshot: CompanyDashboardSnapshot;
};

const W = "dashboard.company.widgets.grow";

export function CompanyGrowListingsWidget({ snapshot }: Props) {
  const { t } = useI18n();
  const top = findTopListing(snapshot.listings);
  const growSlides = useMemo(() => buildGrowListingsSlides(snapshot, t), [snapshot, t]);

  const slides = useMemo(
    () => [
      {
        id: "health",
        content: (
          <div className="flex h-full flex-col">
            <p className="text-3xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
              {snapshot.activeListingCount}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t(`${W}.activePosts`)}</p>
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              {snapshot.pausedListingCount > 0
                ? fmt(t(`${W}.pausedAndTotal`), {
                    paused: snapshot.pausedListingCount,
                    total: snapshot.totalApplicantCount,
                  })
                : fmt(t(`${W}.totalApplicants`), { total: snapshot.totalApplicantCount })}
            </p>
            {top ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">
                {fmt(
                  t(top.applicantCount === 1 ? `${W}.topListing` : `${W}.topListingPlural`),
                  { title: top.title, count: top.applicantCount },
                )}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-600 dark:text-slate-400">{t(`${W}.noListingsYet`)}</p>
            )}
            <Link
              href="/company/internships"
              className="mt-auto pt-3 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
            >
              {t(`${W}.managePosts`)}
            </Link>
          </div>
        ),
      },
      {
        id: "suggestion",
        content: <CompanyHintSlideContent slide={growSlides[0]!} primaryCta />,
      },
      {
        id: "activity",
        content: <CompanyHintSlideContent slide={growSlides[1] ?? growSlides[0]!} primaryCta />,
      },
    ],
    [snapshot, top, growSlides, t],
  );

  return (
    <CyclicWidget
      title={t(`${W}.title`)}
      subtitle={t(`${W}.subtitle`)}
      iconName="briefcase"
      slides={slides}
      accentClass="from-violet-50 via-white to-fuchsia-50 border-violet-200/70 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/30 dark:border-violet-500/30"
      dotClass="bg-violet-600 dark:bg-violet-400"
    />
  );
}
