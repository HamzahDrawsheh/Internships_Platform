"use client";

import { useMemo, useState } from "react";
import type { AttendanceRow, AttendanceStatus } from "@/lib/internship-reports/types";
import { computeAttendancePercentage } from "@/lib/internship-reports/helpers";
import { AttendanceSummaryBar } from "./AttendanceTable";

const STATUS_CYCLE: AttendanceStatus[] = ["present", "absent", "holiday"];
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-200 dark:border-green-800",
  absent: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800",
  excused: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200",
  holiday: "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "P",
  absent: "A",
  excused: "E",
  holiday: "H",
};

type Props = {
  rows: AttendanceRow[];
  monthKey: string;
  readOnly?: boolean;
  onUpdate: (id: string, patch: Partial<AttendanceRow>) => Promise<void>;
};

function buildCalendarDays(year: number, month: number, rowsByDate: Map<string, AttendanceRow>) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const days: Array<{ date: string; row: AttendanceRow | null; inMonth: boolean }> = [];
  for (let i = 0; i < startPad; i++) days.push({ date: "", row: null, inMonth: false });
  for (let d = 1; d <= last.getDate(); d++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ date, row: rowsByDate.get(date) ?? null, inMonth: true });
  }
  return days;
}

export function AttendanceCalendarGrid({ rows, monthKey, readOnly, onUpdate }: Props) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [hoursDraft, setHoursDraft] = useState<Record<string, string>>({});

  const [year, month] = monthKey.split("-").map(Number);
  const rowsByDate = useMemo(() => new Map(rows.map((r) => [r.date, r])), [rows]);
  const monthRows = useMemo(() => rows.filter((r) => r.date.startsWith(monthKey)), [rows, monthKey]);
  const days = useMemo(() => buildCalendarDays(year, month, rowsByDate), [year, month, rowsByDate]);
  const pct = computeAttendancePercentage(monthRows);

  const cycleStatus = async (row: AttendanceRow) => {
    if (readOnly) return;
    const idx = STATUS_CYCLE.indexOf(row.attendance_status === "excused" ? "absent" : row.attendance_status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await onUpdate(row.id, { ...row, attendance_status: next });
  };

  const markWeekPresent = async (weekStart: number) => {
    if (readOnly) return;
    const weekRows = monthRows.filter((r) => {
      const day = Number(r.date.slice(8, 10));
      return day >= weekStart && day < weekStart + 7;
    });
    await Promise.all(weekRows.map((r) => onUpdate(r.id, { ...r, attendance_status: "present" as AttendanceStatus })));
  };

  const saveHours = async (row: AttendanceRow) => {
    const raw = hoursDraft[row.date];
    const n = raw ? Number(raw) : null;
    await onUpdate(row.id, {
      ...row,
      total_hours: n != null && Number.isFinite(n) && n >= 0 ? n : null,
    });
    setExpandedDate(null);
  };

  return (
    <div>
      <AttendanceSummaryBar pct={pct} />
      <p className="mb-3 text-xs text-gray-500">Click a day to cycle: Present → Absent → Holiday. Hours are optional.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {[1, 8, 15, 22].map((w) => (
          <button
            key={w}
            type="button"
            disabled={readOnly}
            onClick={() => void markWeekPresent(w)}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Mark days {w}–{Math.min(w + 6, 31)} present
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-lg grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="mx-auto mt-1 max-w-lg grid grid-cols-7 gap-1">
        {days.map((cell, i) => {
          if (!cell.inMonth || !cell.row) {
            return <div key={`pad-${i}`} className="h-10 sm:h-11" />;
          }
          const row = cell.row;
          const st = row.attendance_status;
          const dayNum = Number(row.date.slice(8, 10));
          return (
            <button
              key={row.date}
              type="button"
              disabled={readOnly}
              title={`${row.date}: ${st}${row.total_hours != null ? ` · ${row.total_hours}h` : ""}`}
              onClick={() => void cycleStatus(row)}
              onDoubleClick={() => setExpandedDate(expandedDate === row.date ? null : row.date)}
              className={`relative flex h-10 w-full flex-col items-center justify-center rounded-md border text-[10px] font-bold leading-tight transition sm:h-11 ${STATUS_COLORS[st]}`}
            >
              <span className="text-[9px] font-normal leading-none opacity-70">{dayNum}</span>
              <span className="leading-none">{STATUS_LABEL[st]}</span>
              {row.total_hours != null && (
                <span className="absolute bottom-0.5 right-1 text-[8px] font-normal leading-none opacity-80">
                  {row.total_hours}h
                </span>
              )}
            </button>
          );
        })}
      </div>

      {expandedDate && !readOnly && (
        <div className="mt-4 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-sm font-medium">{expandedDate} — optional hours</p>
          <input
            type="number"
            min={0}
            step={0.5}
            placeholder="Hours worked"
            value={hoursDraft[expandedDate] ?? rowsByDate.get(expandedDate)?.total_hours ?? ""}
            onChange={(e) => setHoursDraft((p) => ({ ...p, [expandedDate]: e.target.value }))}
            className="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
          <button
            type="button"
            onClick={() => {
              const row = rowsByDate.get(expandedDate);
              if (row) void saveHours(row);
            }}
            className="mt-2 text-sm text-purple-600 hover:underline"
          >
            Save hours
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        <span><span className="inline-block rounded bg-green-100 px-1">P</span> Present</span>
        <span><span className="inline-block rounded bg-red-100 px-1">A</span> Absent</span>
        <span><span className="inline-block rounded bg-gray-100 px-1">H</span> Holiday</span>
      </div>
    </div>
  );
}
