import { EVAL_ATTENDANCE } from "./constants";
import { canStudentSubmitReport } from "./helpers";
import type { MonthlyReportRow } from "./types";

export type WorkflowStepState = "done" | "current" | "pending" | "skipped";

export type WorkflowSteps = {
  student: WorkflowStepState;
  employer: WorkflowStepState;
  supervisor: WorkflowStepState;
};

export type NextAction = {
  title: string;
  description: string;
  href: string;
  urgency: "normal" | "warning" | "overdue";
  ctaLabel: string;
};

export function getWorkflowSteps(status: MonthlyReportRow["status"] | string): WorkflowSteps {
  switch (status) {
    case "approved":
      return { student: "done", employer: "done", supervisor: "done" };
    case "pending_supervisor":
      return { student: "done", employer: "done", supervisor: "current" };
    case "pending_employer":
    case "overdue":
      return { student: "done", employer: "current", supervisor: "pending" };
    case "pending_student":
    case "unlocked":
    case "rejected":
      return { student: "current", employer: "pending", supervisor: "pending" };
    case "locked":
      return { student: "pending", employer: "pending", supervisor: "pending" };
    default:
      return { student: "pending", employer: "pending", supervisor: "pending" };
  }
}

export function daysUntil(dateStr: string): number {
  const d = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function dueDateLabel(dueDate: string): string {
  const days = daysUntil(dueDate);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export function getLockedMonthHint(report: MonthlyReportRow, allReports: MonthlyReportRow[]): string {
  if (report.status !== "locked") return "";
  const today = new Date().toISOString().slice(0, 10);
  if (report.period_start > today) {
    return `Opens ${report.period_start}`;
  }
  if (report.month_number > 1) {
    const prev = allReports.find((r) => r.month_number === report.month_number - 1);
    if (prev && prev.status !== "approved") {
      return `Month ${report.month_number - 1} must be approved first`;
    }
  }
  return "Not yet available";
}

export function isCurrentMonth(report: MonthlyReportRow): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return report.period_start <= today && report.period_end >= today;
}

export function getStudentNextAction(
  reports: MonthlyReportRow[],
  internshipId: string,
  internshipStatus: string
): NextAction | null {
  if (internshipStatus === "pending_supervisor_approval") {
    return {
      title: "Waiting for supervisor approval",
      description: "Your university supervisor must approve internship tracking before monthly reports begin.",
      href: "/dashboard/student/internship-reports",
      urgency: "normal",
      ctaLabel: "View status",
    };
  }

  const actionable = reports.find(
    (r) =>
      canStudentSubmitReport(r, reports) ||
      r.status === "rejected" ||
      (r.status === "pending_student" && r.period_start <= new Date().toISOString().slice(0, 10))
  );
  if (actionable) {
    const urgency = actionable.status === "overdue" ? "overdue" : actionable.status === "rejected" ? "warning" : "normal";
    return {
      title: actionable.status === "rejected" ? `Revise Month ${actionable.month_number}` : `Complete Month ${actionable.month_number}`,
      description: dueDateLabel(actionable.due_date),
      href: `/dashboard/student/internship-reports/${internshipId}/month/${actionable.month_number}`,
      urgency,
      ctaLabel: actionable.status === "rejected" ? "Revise report" : "Continue form",
    };
  }

  const waiting = reports.find((r) => r.status === "pending_employer" || r.status === "pending_supervisor");
  if (waiting) {
    return {
      title: `Month ${waiting.month_number} submitted`,
      description:
        waiting.status === "pending_employer"
          ? "Waiting for employer evaluation."
          : "Waiting for university supervisor approval.",
      href: `/dashboard/student/internship-reports/${internshipId}/month/${waiting.month_number}`,
      urgency: "normal",
      ctaLabel: "View status",
    };
  }

  return null;
}

export function getCompanyNextAction(
  pendingReports: Array<MonthlyReportRow & { student_name?: string; internship_id: string }>
): NextAction | null {
  const next = pendingReports[0];
  if (!next) return null;
  return {
    title: `Evaluate ${next.student_name ?? "trainee"}'s Month ${next.month_number}`,
    description: "Complete Part II employer evaluation.",
    href: `/company/internship-reports/${next.internship_id}/month/${next.month_number}`,
    urgency: next.status === "overdue" ? "overdue" : "normal",
    ctaLabel: "Open evaluation",
  };
}

export function getSupervisorNextAction(
  pendingReports: Array<MonthlyReportRow & { student_name?: string; internship_id: string }>
): NextAction | null {
  const next = pendingReports.find((r) => r.status === "pending_supervisor");
  if (!next) return null;
  return {
    title: `Approve Month ${next.month_number} for ${next.student_name ?? "student"}`,
    description: "Review student and employer sections, then approve or request revision.",
    href: `/supervisor/internship-reports/${next.internship_id}/month/${next.month_number}`,
    urgency: "normal",
    ctaLabel: "Review report",
  };
}

export function suggestAttendanceRating(pct: number): string {
  if (pct >= 90) return EVAL_ATTENDANCE[0];
  if (pct >= 75) return EVAL_ATTENDANCE[1];
  return EVAL_ATTENDANCE[2];
}

export function countPendingForRole(
  role: "student" | "company" | "supervisor",
  reports: MonthlyReportRow[],
  internshipStatus?: string
): number {
  if (role === "student") {
    if (internshipStatus === "pending_supervisor_approval") return 1;
    return reports.filter((r) => canStudentSubmitReport(r, reports) || r.status === "rejected").length;
  }
  if (role === "company") {
    return reports.filter((r) => r.status === "pending_employer" || r.status === "overdue").length;
  }
  return reports.filter((r) => r.status === "pending_supervisor").length;
}
