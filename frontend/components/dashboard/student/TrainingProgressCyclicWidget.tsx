"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { ProgressDonutChart } from "@/components/dashboard/ProgressDonutChart";
import { Button } from "@/components/ui";
import type { InternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import {
  localizeTrackCardLabels,
  localizeTrackDuration,
  localizeTrackHint,
  localizeTrackStatusLabel,
} from "@/lib/i18n/track-display";

type Props = {
  positionTitle: string;
  companyName: string;
  startDate: string;
  endDate: string;
  track: InternshipTrackSummary;
  reportsDueCount: number;
};

export function TrainingProgressCyclicWidget({
  positionTitle,
  companyName,
  startDate,
  endDate,
  track,
  reportsDueCount,
}: Props) {
  const { t } = useI18n();
  const { completedLabel, remainingLabel, reportsApprovedLabel } = localizeTrackCardLabels(track, t);
  const duration = localizeTrackDuration(startDate, endDate, t);
  const statusLabel = localizeTrackStatusLabel(track.statusLabel, t);
  const hint = localizeTrackHint(track.hint, t);

  const slides = useMemo(
    () => [
      {
        id: "donut",
        content: (
          <div className="flex h-full flex-col sm:flex-row sm:items-center sm:gap-4">
            <ProgressDonutChart
              percent={track.overallPercent}
              label={t("dashboard.student.widgets.completeLabel")}
              sublabel={remainingLabel}
            />
            <div className="mt-3 min-w-0 flex-1 sm:mt-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t("dashboard.student.yourInternship")}
              </p>
              <h4 className="mt-1 line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                {positionTitle}
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                {companyName} · {duration}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                {statusLabel}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "details",
        content: (
          <div className="flex h-full flex-col">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{completedLabel}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{remainingLabel}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-slate-300">{hint}</p>
            {reportsApprovedLabel ? (
              <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                {reportsApprovedLabel}
              </p>
            ) : null}
            <p className="mt-auto pt-3 text-xs text-gray-500 dark:text-slate-400">
              {fmt(t("dashboard.student.percentComplete"), { pct: track.overallPercent })}
            </p>
          </div>
        ),
      },
      {
        id: "reports",
        content: (
          <div className="flex h-full flex-col">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {reportsDueCount > 0
                ? reportsDueCount === 1
                  ? t("dashboard.student.oneReportAttention")
                  : fmt(t("dashboard.student.reportsAttention"), { count: reportsDueCount })
                : t("dashboard.student.allReportsApproved")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
              {t("dashboard.student.monthlyReportsLinkDesc")}
            </p>
            <Link href="/dashboard/student/internship-reports" className="mt-auto pt-4">
              <Button variant="primary" className="w-full rounded-xl">
                {t("dashboard.student.openMonthlyReports")}
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [
      t,
      positionTitle,
      companyName,
      duration,
      statusLabel,
      hint,
      completedLabel,
      remainingLabel,
      track.overallPercent,
      reportsApprovedLabel,
      reportsDueCount,
    ]
  );

  return (
    <CyclicWidget
      title={t("dashboard.student.widgets.trainingTitle")}
      subtitle={t("dashboard.student.widgets.trainingSubtitle")}
      iconName="calendar"
      slides={slides}
      accentClass="from-emerald-50 via-white to-teal-50 border-emerald-200/70 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 dark:border-emerald-500/30"
      dotClass="bg-emerald-600 dark:bg-emerald-400"
    />
  );
}
