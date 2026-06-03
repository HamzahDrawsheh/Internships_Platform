"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanyLogo } from "@/components/companies/CompanyLogo";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { ProgressDonutChart } from "@/components/dashboard/ProgressDonutChart";
import { TrainingProgressBreakdownChart } from "@/components/dashboard/TrainingProgressBreakdownChart";
import { Button } from "@/components/ui";
import { useDashboardDataRefresh } from "@/lib/dashboard/student-dashboard-sync";
import { canStudentSubmitReport } from "@/lib/internship-reports/helpers";
import { buildInternshipTrackSummary, type InternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import {
  localizeTrackCardLabels,
  localizeTrackDuration,
  localizeTrackHint,
  localizeTrackStatusLabel,
} from "@/lib/i18n/track-display";
import { createClient } from "@/lib/supabase/client";

type Props = {
  internshipId: string;
  positionTitle: string;
  companyName: string;
  companyLogoUrl?: string | null;
  startDate: string;
  endDate: string;
  internshipStatus: string;
  initialTrack: InternshipTrackSummary;
  initialReportsDueCount: number;
};

export function TrainingProgressCyclicWidget({
  internshipId,
  positionTitle,
  companyName,
  companyLogoUrl,
  startDate,
  endDate,
  internshipStatus,
  initialTrack,
  initialReportsDueCount,
}: Props) {
  const { t } = useI18n();
  const [track, setTrack] = useState(initialTrack);
  const [reportsDueCount, setReportsDueCount] = useState(initialReportsDueCount);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: reps } = await supabase
      .from("internship_monthly_reports")
      .select("*")
      .eq("internship_id", internshipId)
      .order("month_number");
    const reports = (reps ?? []) as MonthlyReportRow[];

    let due = 0;
    if (internshipStatus === "pending_supervisor_approval") {
      due = 1;
    } else {
      due = reports.filter((r) => canStudentSubmitReport(r, reports)).length;
    }

    setReportsDueCount(due);
    setTrack(buildInternshipTrackSummary(reports, startDate, endDate, internshipStatus, due));
  }, [endDate, internshipId, internshipStatus, startDate]);

  useEffect(() => {
    // Parent dashboard may refresh the precomputed summary; mirror that into the widget state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrack(initialTrack);
    setReportsDueCount(initialReportsDueCount);
  }, [initialTrack, initialReportsDueCount]);

  useDashboardDataRefresh(refresh);

  const { completedLabel, remainingLabel } = localizeTrackCardLabels(track, t);
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
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <CompanyLogo
                  name={companyName}
                  logoUrl={companyLogoUrl}
                  size="xs"
                  className="ring-1 ring-emerald-200/80 dark:ring-emerald-500/30"
                />
                <h4 className="line-clamp-2 text-base font-semibold text-gray-900 dark:text-white">
                  {positionTitle}
                </h4>
              </div>
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
            <p className="text-xs text-gray-500 dark:text-slate-400">{remainingLabel}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-700 dark:text-slate-300">{hint}</p>
            {track.reportTotal > 0 ? (
              <div className="flex flex-1 items-center justify-center py-2">
                <TrainingProgressBreakdownChart
                  reportApproved={track.reportApproved}
                  reportTotal={track.reportTotal}
                  label={t("dashboard.student.widgets.chartReports")}
                />
              </div>
            ) : (
              <p className="mt-auto pt-3 text-xs text-gray-500 dark:text-slate-400">{completedLabel}</p>
            )}
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
      companyLogoUrl,
      duration,
      statusLabel,
      hint,
      completedLabel,
      remainingLabel,
      track.overallPercent,
      track.reportApproved,
      track.reportTotal,
      reportsDueCount,
    ],
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
