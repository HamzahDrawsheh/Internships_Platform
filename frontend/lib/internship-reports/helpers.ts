import type { AttendanceRow, MonthlyReportRow } from "./types";

export function formatIsoDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function computeAttendancePercentage(rows: AttendanceRow[]): number {
  const workdays = rows.filter((r) => r.attendance_status !== "holiday");
  if (!workdays.length) return 100;
  const present = workdays.filter((r) => r.attendance_status === "present" || r.attendance_status === "excused").length;
  return Math.round((present / workdays.length) * 100);
}

export function computeHoursBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return null;
  return Math.round((mins / 60) * 100) / 100;
}

export function allMonthlyReportsApproved(reports: MonthlyReportRow[]): boolean {
  if (!reports.length) return false;
  return reports.every((r) => r.status === "approved");
}

export function internshipPeriodComplete(endDate: string): boolean {
  const end = new Date(`${endDate}T23:59:59`);
  return end.getTime() <= Date.now();
}

export function canUploadFinalReport(
  reports: MonthlyReportRow[],
  endDate: string,
  internshipStatus: string
): boolean {
  return (
    internshipStatus === "active" || internshipStatus === "completed"
  ) && allMonthlyReportsApproved(reports) && internshipPeriodComplete(endDate);
}

export function canStudentSubmitReport(report: MonthlyReportRow, reports: MonthlyReportRow[]): boolean {
  if (!["unlocked", "overdue", "rejected", "pending_student"].includes(report.status)) return false;
  if (report.month_number > 1) {
    const prev = reports.find((r) => r.month_number === report.month_number - 1);
    if (!prev || prev.status !== "approved") return false;
  }
  // Allow submit when reporting period has started.
  const today = new Date().toISOString().slice(0, 10);
  if (report.period_start > today) return false;
  return true;
}

export function progressPercent(reports: MonthlyReportRow[]): number {
  if (!reports.length) return 0;
  const approved = reports.filter((r) => r.status === "approved").length;
  return Math.round((approved / reports.length) * 100);
}

export function filterAttendanceForMonth(
  attendance: AttendanceRow[],
  periodStart: string,
  periodEnd: string
): AttendanceRow[] {
  return attendance.filter((a) => a.date >= periodStart && a.date <= periodEnd);
}
