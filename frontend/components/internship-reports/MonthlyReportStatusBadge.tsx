"use client";

import { MONTHLY_REPORT_STATUS_LABELS } from "@/lib/internship-reports/constants";
import type { MonthlyReportStatus } from "@/lib/internship-reports/types";
import { monthlyReportStatusTextClass } from "@/lib/ui/status-text";
import { useI18n } from "@/lib/i18n/context";

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
  const { lt } = useI18n();
  const label = MONTHLY_REPORT_STATUS_LABELS[status] ?? status;
  const icon = STATUS_ICONS[status] ?? "•";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${monthlyReportStatusTextClass(status)}`}
      role="status"
    >
      <span aria-hidden>{icon}</span>
      {lt(label)}
    </span>
  );
}
