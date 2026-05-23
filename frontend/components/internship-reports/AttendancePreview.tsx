"use client";

import { useMemo } from "react";
import type { AttendanceRow } from "@/lib/internship-reports/types";
import { computeAttendancePercentage, filterAttendanceForMonth } from "@/lib/internship-reports/helpers";

type Props = {
  attendance: AttendanceRow[];
  periodStart: string;
  periodEnd: string;
};

export function AttendancePreview({ attendance, periodStart, periodEnd }: Props) {
  const monthRows = useMemo(
    () => filterAttendanceForMonth(attendance, periodStart, periodEnd),
    [attendance, periodStart, periodEnd]
  );
  const pct = computeAttendancePercentage(monthRows);
  const present = monthRows.filter((r) => r.attendance_status === "present" || r.attendance_status === "excused").length;
  const absent = monthRows.filter((r) => r.attendance_status === "absent").length;

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Your attendance this month</h3>
      <p className="mt-1 text-xs text-gray-500">Read-only preview — employer manages attendance.</p>
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <span className="font-semibold text-green-700 dark:text-green-400">{pct}% rate</span>
        <span className="text-gray-600 dark:text-gray-400">{present} present</span>
        <span className="text-gray-600 dark:text-gray-400">{absent} absent</span>
        <span className="text-gray-600 dark:text-gray-400">{monthRows.length} days tracked</span>
      </div>
    </div>
  );
}
