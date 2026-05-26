"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceCalendarGrid } from "@/components/internship-reports/AttendanceCalendarGrid";
import { AttendanceTable } from "@/components/internship-reports/AttendanceTable";
import type { AttendanceRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

export default function CompanyAttendancePage() {
  const params = useParams();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [studentName, setStudentName] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  useEffect(() => {
    if (!internshipId) return;
    const supabase = createClient();
    const load = async () => {
      const { data: i } = await supabase.from("internships").select("student_id").eq("id", internshipId).maybeSingle();
      if (i?.student_id) {
        const { data: st } = await supabase.from("students").select("user_id").eq("id", i.student_id).maybeSingle();
        if (st?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
          setStudentName(p?.full_name ?? "Trainee");
        }
      }
      const { data } = await supabase
        .from("internship_attendance")
        .select("*")
        .eq("internship_id", internshipId)
        .order("date");
      const list = (data ?? []) as AttendanceRow[];
      setRows(list);
      if (list.length) {
        setMonthFilter((prev) => prev || list[list.length - 1].date.slice(0, 7));
      }
    };
    void load();
  }, [internshipId]);

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.date.slice(0, 7)));
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (!monthFilter) return rows;
    return rows.filter((r) => r.date.startsWith(monthFilter));
  }, [rows, monthFilter]);

  const onUpdate = async (id: string, patch: Partial<AttendanceRow>) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("internship_attendance")
      .update({
        attendance_status: patch.attendance_status,
        start_time: patch.start_time,
        end_time: patch.end_time,
        total_hours: patch.total_hours,
        remarks: patch.remarks,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (data) {
      setRows((prev) => prev.map((r) => (r.id === id ? (data as AttendanceRow) : r)));
    }
  };

  return (
    <main className="py-8">
      <Container>
        <PageHeader title="Attendance management" description={`Click days to mark attendance for ${studentName}`} />
        <Link href="/company/internship-reports" className="text-sm text-purple-600 hover:underline">
          ← Back
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-800">
          {months.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMonthFilter(m)}
              className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
                monthFilter === m
                  ? "border-purple-600 text-purple-700 dark:text-purple-300"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${viewMode === "calendar" ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${viewMode === "table" ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}
          >
            Table
          </button>
        </div>

        <div className="mt-6">
          {viewMode === "calendar" && monthFilter ? (
            <AttendanceCalendarGrid rows={filtered} monthKey={monthFilter} onUpdate={onUpdate} />
          ) : (
            <AttendanceTable rows={filtered} onUpdate={onUpdate} />
          )}
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Attendance days are required; work hours are optional. Double-click a day in calendar view to enter hours.
        </p>
      </Container>
    </main>
  );
}
