"use client";

import Link from "next/link";
import { ReportWorkflowStepper } from "./ReportWorkflowStepper";
import { MonthlyReportStatusBadge } from "./MonthlyReportStatusBadge";
import { Button } from "@/components/ui";
import { canStudentSubmitReport, formatIsoDate } from "@/lib/internship-reports/helpers";
import { dueDateLabel, getLockedMonthHint, isCurrentMonth } from "@/lib/internship-reports/workflow";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";

type Props = {
  reports: MonthlyReportRow[];
  internshipId: string;
  role: "student" | "company" | "supervisor";
  basePath: string;
};

export function MonthTimeline({ reports, internshipId, role, basePath }: Props) {
  return (
    <div className="space-y-4">
      {reports.map((r) => {
        const lockedHint = getLockedMonthHint(r, reports);
        const current = isCurrentMonth(r);
        const canOpen =
          role === "student"
            ? canStudentSubmitReport(r, reports) || r.status === "approved" || r.status === "pending_employer" || r.status === "pending_supervisor"
            : role === "company"
              ? r.status === "pending_employer" || r.status === "overdue" || r.status === "approved"
              : r.status === "pending_supervisor" || r.status === "approved";

        const href =
          role === "student"
            ? `/dashboard/student/internship-reports/${internshipId}/month/${r.month_number}`
            : role === "company"
              ? r.status === "pending_employer" || r.status === "overdue"
                ? `/company/internship-reports/${internshipId}/month/${r.month_number}`
                : `${basePath}/${internshipId}/evaluations`
              : `/supervisor/internship-reports/${internshipId}/month/${r.month_number}`;

        return (
          <div
            key={r.id}
            className={`relative rounded-2xl border p-4 transition-shadow ${
              current ? "border-purple-400 ring-2 ring-purple-200 dark:border-purple-600 dark:ring-purple-900/50" : "border-gray-200 dark:border-gray-800"
            } ${r.status === "locked" ? "opacity-70" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Month {r.month_number}</h4>
                  {current && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {formatIsoDate(r.period_start)} – {formatIsoDate(r.period_end)}
                </p>
                {r.status !== "locked" && r.status !== "approved" && (
                  <p className={`mt-1 text-xs font-medium ${r.status === "overdue" ? "text-red-600" : "text-amber-700 dark:text-amber-400"}`}>
                    {dueDateLabel(r.due_date)}
                  </p>
                )}
                {lockedHint && <p className="mt-1 text-xs text-gray-400">{lockedHint}</p>}
              </div>
              <MonthlyReportStatusBadge status={r.status} />
            </div>

            <div className="mt-4">
              <ReportWorkflowStepper report={r} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {canOpen && r.status !== "locked" && (
                <Link href={href}>
                  <Button variant={canStudentSubmitReport(r, reports) && role === "student" ? "primary" : "secondary"}>
                    {role === "student" && canStudentSubmitReport(r, reports) ? "Open form" : role === "company" ? "Evaluate" : role === "supervisor" ? "Review" : "View"}
                  </Button>
                </Link>
              )}
              {r.status === "approved" && (
                <a href={`/api/internship-reports/${r.id}/pdf`} target="_blank" rel="noreferrer">
                  <Button variant="secondary">PDF</Button>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
