"use client";

import { MONTHLY_REPORT_STATUS_LABELS } from "@/lib/internship-reports/constants";
import type { MonthlyReportStatus } from "@/lib/internship-reports/types";

const STATUS_ICONS: Record<string, string> = {
  locked: "🔒",
  unlocked: "🔓",
  pending_student: "✏️",
  pending_employer: "🏢",
  pending_supervisor: "🎓",
  approved: "✅",
  rejected: "↩️",
  overdue: "⚠️",
};

export function MonthlyReportStatusBadge({ status }: { status: MonthlyReportStatus | string }) {
  const label = MONTHLY_REPORT_STATUS_LABELS[status] ?? status;
  const icon = STATUS_ICONS[status] ?? "•";
  const color =
    status === "approved"
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
      : status === "overdue" || status === "rejected"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
        : status === "pending_employer" || status === "pending_supervisor"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
          : status === "unlocked"
            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`} role="status">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  );
}
