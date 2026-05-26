"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { TrainingProgressBreakdownChart } from "@/components/dashboard/TrainingProgressBreakdownChart";
import { Button } from "@/components/ui";
import type { CompanyDashboardSnapshot, CompanyTraineeSnapshot } from "@/lib/dashboard/load-company-dashboard-snapshot";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type Props = {
  snapshot: CompanyDashboardSnapshot;
};

const W = "dashboard.company.widgets.trainee";

function TraineeSlide({ trainee, t }: { trainee: CompanyTraineeSnapshot; t: (key: string) => string }) {
  const statusLabel =
    trainee.status === "active"
      ? t(`${W}.inProgress`)
      : trainee.status === "completed"
        ? t(`${W}.completed`)
        : trainee.status.replace(/_/g, " ");

  return (
    <div className="flex h-full flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        {t(`${W}.yourTrainee`)}
      </p>
      <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{trainee.studentName}</p>
      <p className="mt-0.5 text-sm text-gray-600 dark:text-slate-400">{trainee.positionTitle}</p>
      <span className="mt-2 inline-flex w-fit rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
        {statusLabel}
      </span>
      {trainee.track.reportTotal > 0 ? (
        <div className="flex flex-1 items-center justify-center py-2">
          <TrainingProgressBreakdownChart
            reportApproved={trainee.track.reportApproved}
            reportTotal={trainee.track.reportTotal}
            label={t(`${W}.monthlyReports`)}
          />
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">{t(`${W}.reportsUnlockHint`)}</p>
      )}
      {trainee.evalPending > 0 ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {fmt(
            t(trainee.evalPending === 1 ? `${W}.evaluationsDue` : `${W}.evaluationsDuePlural`),
            { count: trainee.evalPending },
          )}
        </p>
      ) : null}
      <Link href="/company/internship-reports" className="mt-auto pt-3">
        <Button variant="secondary" className="w-full rounded-xl text-xs">
          {t(`${W}.openTraineeReports`)}
        </Button>
      </Link>
    </div>
  );
}

function OverviewSlide({ snapshot, t }: { snapshot: CompanyDashboardSnapshot; t: (key: string) => string }) {
  const { traineeOverview, pendingEvalCount } = snapshot;
  const reportLine =
    traineeOverview.totalReports > 0
      ? fmt(t(`${W}.reportsApproved`), {
          approved: traineeOverview.approvedReports,
          total: traineeOverview.totalReports,
        })
      : t(`${W}.noReportsYet`);

  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t(`${W}.allTrainees`)}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
        {traineeOverview.activeCount}
      </p>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {traineeOverview.activeCount === 1 ? t(`${W}.activeTrainee`) : t(`${W}.activeTrainees`)}
      </p>
      <p className="mt-3 text-sm text-gray-700 dark:text-slate-300">{reportLine}</p>
      {traineeOverview.totalReports > 0 ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            style={{ width: `${traineeOverview.overallPercent}%` }}
          />
        </div>
      ) : null}
      {pendingEvalCount > 0 ? (
        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
          {fmt(
            t(pendingEvalCount === 1 ? `${W}.employerEvalPending` : `${W}.employerEvalPendingPlural`),
            { count: pendingEvalCount },
          )}
        </p>
      ) : null}
      {snapshot.activeTrainees.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-gray-600 dark:text-slate-400">
          {snapshot.activeTrainees.slice(0, 3).map((tr) => (
            <li key={tr.internshipId}>
              {fmt(t(`${W}.traineeLine`), {
                name: tr.studentName,
                approved: tr.track.reportApproved,
                total: tr.track.reportTotal,
              })}
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href="/company/internship-reports"
        className="mt-auto pt-3 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-300"
      >
        {t(`${W}.reportsHub`)}
      </Link>
    </div>
  );
}

function EmptySlide({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex h-full flex-col">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{t(`${W}.noActiveTrainees`)}</p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
        {t(`${W}.noActiveBody`)}
      </p>
      <Link href="/company/applications" className="mt-auto pt-4">
        <Button variant="primary" className="w-full rounded-xl text-xs">
          {t(`${W}.reviewApplications`)}
        </Button>
      </Link>
    </div>
  );
}

export function CompanyTraineeProgressWidget({ snapshot }: Props) {
  const { t } = useI18n();
  const primary = snapshot.activeTrainees[0] ?? snapshot.trainees[0];

  const slides = useMemo(() => {
    if (!primary) {
      return [
        { id: "empty", content: <EmptySlide t={t} /> },
        { id: "empty-2", content: <EmptySlide t={t} /> },
        { id: "overview", content: <OverviewSlide snapshot={snapshot} t={t} /> },
      ];
    }
    const secondary = snapshot.activeTrainees[1];
    return [
      { id: "trainee-1", content: <TraineeSlide trainee={primary} t={t} /> },
      {
        id: "trainee-2",
        content: secondary ? (
          <TraineeSlide trainee={secondary} t={t} />
        ) : (
          <OverviewSlide snapshot={snapshot} t={t} />
        ),
      },
      { id: "overview", content: <OverviewSlide snapshot={snapshot} t={t} /> },
    ];
  }, [snapshot, primary, t]);

  return (
    <CyclicWidget
      title={t(`${W}.title`)}
      subtitle={t(`${W}.subtitle`)}
      iconName="calendar"
      slides={slides}
      accentClass="from-emerald-50 via-white to-teal-50 border-emerald-200/70 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30 dark:border-emerald-500/30"
      dotClass="bg-emerald-600 dark:bg-emerald-400"
    />
  );
}
