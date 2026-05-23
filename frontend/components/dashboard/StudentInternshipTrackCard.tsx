"use client";

import Link from "next/link";
import type { InternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import { useI18n } from "@/lib/i18n/context";
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
  href?: string;
};

export function StudentInternshipTrackCard({
  positionTitle,
  companyName,
  startDate,
  endDate,
  track,
  href = "/dashboard/student/internship-reports",
}: Props) {
  const { t } = useI18n();
  const { completedLabel, remainingLabel, reportsApprovedLabel } = localizeTrackCardLabels(track, t);
  const duration = localizeTrackDuration(startDate, endDate, t);
  const statusLabel = localizeTrackStatusLabel(track.statusLabel, t);
  const hint = localizeTrackHint(track.hint, t);

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm transition-all duration-300 hover:border-violet-300 hover:shadow-md dark:border-violet-500/30 dark:from-violet-950/40 dark:via-gray-900 dark:to-indigo-950/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            {t("dashboard.student.yourInternship")}
          </p>
          <h2 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">{positionTitle}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {companyName} · {duration}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-xs font-medium capitalize text-violet-800 shadow-sm dark:bg-violet-500/15 dark:text-violet-200">
          {statusLabel}
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">{completedLabel}</span>
          <span className="text-gray-500 dark:text-gray-400">{remainingLabel}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
            style={{ width: `${track.overallPercent}%` }}
          />
        </div>
        {reportsApprovedLabel ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{reportsApprovedLabel}</p>
        ) : null}
      </div>

      <p className="mt-4 text-sm text-violet-900/90 dark:text-violet-200/90">{hint}</p>
      <p className="mt-3 text-xs font-medium text-violet-700 group-hover:underline dark:text-violet-300">
        {t("dashboard.student.openMonthlyReports")}
      </p>
    </Link>
  );
}
