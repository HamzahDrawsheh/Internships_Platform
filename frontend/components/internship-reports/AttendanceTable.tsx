"use client";

import { useRef } from "react";
import type { AttendanceRow } from "@/lib/internship-reports/types";
import { computeHoursBetween } from "@/lib/internship-reports/helpers";

type Props = {
  rows: AttendanceRow[];
  readOnly?: boolean;
  onUpdate: (id: string, patch: Partial<AttendanceRow>) => Promise<void>;
  savingId?: string | null;
};

export function AttendanceTable({ rows, readOnly, onUpdate, savingId }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">Day</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Start</th>
            <th className="px-3 py-2 text-left font-medium">End</th>
            <th className="px-3 py-2 text-left font-medium">Hours</th>
            <th className="px-3 py-2 text-left font-medium">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <AttendanceRowEditor
              key={row.id}
              row={row}
              readOnly={readOnly}
              saving={savingId === row.id}
              onUpdate={onUpdate}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceRowEditor({
  row,
  readOnly,
  saving,
  onUpdate,
}: {
  row: AttendanceRow;
  readOnly?: boolean;
  saving?: boolean;
  onUpdate: Props["onUpdate"];
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = (p: Partial<AttendanceRow>) => {
    if (readOnly) return;
    const merged = { ...row, ...p };
    if (p.start_time !== undefined || p.end_time !== undefined) {
      merged.total_hours = computeHoursBetween(merged.start_time, merged.end_time);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void onUpdate(row.id, merged);
    }, 400);
  };

  return (
    <tr className={saving ? "opacity-60" : ""}>
      <td className="whitespace-nowrap px-3 py-2">{row.date}</td>
      <td className="px-3 py-2">{row.weekday?.trim() ?? "—"}</td>
      <td className="px-3 py-2">
        {readOnly ? (
          row.attendance_status
        ) : (
          <select
            value={row.attendance_status}
            onChange={(e) => patch({ attendance_status: e.target.value as AttendanceRow["attendance_status"] })}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
            <option value="holiday">Holiday</option>
          </select>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          disabled={readOnly}
          value={row.start_time?.slice(0, 5) ?? ""}
          onChange={(e) => patch({ start_time: e.target.value ? `${e.target.value}:00` : null })}
          className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="time"
          disabled={readOnly}
          value={row.end_time?.slice(0, 5) ?? ""}
          onChange={(e) => patch({ end_time: e.target.value ? `${e.target.value}:00` : null })}
          className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        />
      </td>
      <td className="px-3 py-2">{row.total_hours ?? "—"}</td>
      <td className="px-3 py-2">
        <input
          type="text"
          disabled={readOnly}
          defaultValue={row.remarks ?? ""}
          onBlur={(e) => patch({ remarks: e.target.value || null })}
          placeholder="Remarks"
          className="w-full min-w-[120px] rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        />
      </td>
    </tr>
  );
}

export function AttendanceSummaryBar({ pct }: { pct: number }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attendance rate</span>
      <span className={`text-lg font-bold ${pct >= 90 ? "text-green-600" : pct >= 75 ? "text-amber-600" : "text-red-600"}`}>
        {pct}%
      </span>
    </div>
  );
}
