"use client";

import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { progressPercent } from "@/lib/internship-reports/helpers";
import { MonthlyReportStatusBadge } from "./MonthlyReportStatusBadge";

type Props = {
  reports: MonthlyReportRow[];
  startDate: string;
  endDate: string;
  internshipStatus: string;
};

export function InternshipProgressCard({ reports, startDate, endDate, internshipStatus }: Props) {
  const pct = progressPercent(reports);
  const approved = reports.filter((r) => r.status === "approved").length;
  const pending = reports.filter((r) =>
    ["unlocked", "overdue", "pending_student", "pending_employer", "pending_supervisor", "rejected"].includes(r.status)
  ).length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Internship progress</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {startDate} → {endDate} · Status: <span className="capitalize">{internshipStatus.replace(/_/g, " ")}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{pct}%</p>
          <p className="text-xs text-gray-500">{approved}/{reports.length} months approved</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className="h-full rounded-full bg-purple-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {pending > 0 && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          {pending} monthly report{pending !== 1 ? "s" : ""} need attention
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {reports.map((r) => (
          <div key={r.id} className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-2 py-1 text-xs dark:border-gray-800">
            <span className="font-medium">M{r.month_number}</span>
            <MonthlyReportStatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
