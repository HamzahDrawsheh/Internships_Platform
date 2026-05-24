import type { createAdminClient } from "@/lib/supabase/admin";
import { MONTHLY_REPORT_STATUS_LABELS } from "@/lib/internship-reports/constants";
import {
  allMonthlyReportsApproved,
  canStudentSubmitReport,
  canUploadFinalReport,
  computeAttendancePercentage,
  filterAttendanceForMonth,
  internshipPeriodComplete,
  progressPercent,
} from "@/lib/internship-reports/helpers";
import type { AttendanceRow, FinalReportRow, InternshipRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import {
  dueDateLabel,
  getLockedMonthHint,
  getStudentNextAction,
  getWorkflowSteps,
} from "@/lib/internship-reports/workflow";

type Admin = ReturnType<typeof createAdminClient>;

function norm(input: unknown, maxLen = 500): string {
  if (input === null || input === undefined) return "";
  const s = String(input).replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

/** Static product guide — always included so the model knows submission steps. */
export const MONTHLY_REPORTS_WORKFLOW_GUIDE = [
  "=== MONTHLY_INTERNSHIP_REPORTS_GUIDE (JUST digital workflow) ===",
  "Navigation: Student Dashboard → Monthly internship reports (/dashboard/student/internship-reports).",
  "Prerequisites: application accepted → university supervisor approves internship tracking → monthly report slots are generated.",
  "Each month cycle (Student → Employer → University Supervisor):",
  "  1) Student Part I (4-step wizard): Basic info → Assignments & summary → Weekly work descriptions → Review & submit + signature.",
  "  2) Employer Part II: evaluation + attendance is managed by company (student sees read-only attendance summary).",
  "  3) University supervisor: reviews Part I + Part II and approves or requests revision.",
  "  4) When approved, PDF is generated for that month.",
  "After ALL monthly reports approved AND internship end date passed: upload final comprehensive PDF on internship detail page.",
  "Student editable report statuses: unlocked, pending_student, rejected, overdue (not when awaiting employer/supervisor unless rejected).",
  "Locked months: wait until period starts and previous month is approved.",
  "Links pattern: /dashboard/student/internship-reports/{internshipId}/month/{monthNumber}",
].join("\n");

export type InternshipReportsContext = {
  contextBlock: string;
  reportSummaryLines: string[];
  hasInternshipTracking: boolean;
};

export async function buildStudentInternshipReportsContext(
  admin: Admin,
  studentId: string
): Promise<InternshipReportsContext> {
  const { data: internships } = await admin
    .from("internships")
    .select("*")
    .eq("student_id", studentId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (!internships?.length) {
    return {
      contextBlock: [
        MONTHLY_REPORTS_WORKFLOW_GUIDE,
        "=== YOUR_INTERNSHIP_TRACKING ===",
        "No active internship tracking yet. Monthly reports appear after a company accepts your application and your university supervisor approves tracking.",
      ].join("\n\n"),
      reportSummaryLines: [
        "No internship tracking yet — apply, get accepted, wait for supervisor approval to unlock monthly JUST reports.",
      ],
      hasInternshipTracking: false,
    };
  }

  const reportSummaryLines: string[] = [];
  const internshipBlocks: string[] = [];

  for (const raw of internships as InternshipRow[]) {
    const internshipId = raw.id;

    const [{ data: reports }, { data: finalReport }, { data: app }, { data: attendance }] = await Promise.all([
      admin
        .from("internship_monthly_reports")
        .select("*")
        .eq("internship_id", internshipId)
        .order("month_number"),
      admin.from("internship_final_reports").select("*").eq("internship_id", internshipId).maybeSingle(),
      admin
        .from("applications")
        .select("internship_positions(title, companies(company_name))")
        .eq("id", raw.application_id)
        .maybeSingle(),
      admin.from("internship_attendance").select("*").eq("internship_id", internshipId),
    ]);

    const reps = (reports ?? []) as MonthlyReportRow[];
    const attRows = (attendance ?? []) as AttendanceRow[];
    const pos = app?.internship_positions as { title?: string; companies?: { company_name?: string } } | null;
    const companyName = norm(pos?.companies?.company_name, 120) || "Company";
    const positionTitle = norm(pos?.title, 120) || "Internship";
    const nextAction = getStudentNextAction(reps, internshipId, raw.status);
    const pct = progressPercent(reps);
    const finalUnlocked = canUploadFinalReport(reps, raw.end_date, raw.status);
    const fr = finalReport as FinalReportRow | null;

    internshipBlocks.push(
      [
        `INTERNSHIP_ID: ${internshipId}`,
        `POSITION: ${positionTitle}`,
        `COMPANY: ${companyName}`,
        `INTERNSHIP_STATUS: ${raw.status}`,
        `PERIOD: ${raw.start_date} → ${raw.end_date}`,
        `UNIVERSITY_SUPERVISOR: ${norm(raw.university_supervisor_name, 120) || "not set"}`,
        `MONTHLY_PROGRESS: ${pct}% (${reps.filter((r) => r.status === "approved").length}/${reps.length} months approved)`,
        nextAction
          ? `NEXT_ACTION: ${nextAction.title} — ${nextAction.description} → ${nextAction.href}`
          : "NEXT_ACTION: none (all caught up or waiting on others)",
        `FINAL_REPORT_UPLOAD: ${fr ? `uploaded (${fr.status})` : finalUnlocked ? "unlocked — upload at /dashboard/student/internship-reports/" + internshipId : "locked (complete all months + pass end date)"}`,
        `REPORTS_LIST_URL: /dashboard/student/internship-reports`,
        `DETAIL_URL: /dashboard/student/internship-reports/${internshipId}`,
      ].join("\n")
    );

    reportSummaryLines.push(
      `${positionTitle} at ${companyName}: internship ${raw.status}, ${reps.length} monthly reports, ${pct}% approved` +
        (nextAction ? `, next: ${nextAction.title}` : "")
    );

    for (const r of reps) {
      const { data: weeks } = await admin
        .from("internship_weekly_reports")
        .select("week_number, description")
        .eq("monthly_report_id", r.id)
        .order("week_number");

      const weekList = weeks ?? [];
      const weeksFilled = weekList.filter((w) => norm(w.description).length > 0).length;
      const monthAtt = filterAttendanceForMonth(attRows, r.period_start, r.period_end);
      const attPct = monthAtt.length ? computeAttendancePercentage(monthAtt) : null;
      const steps = getWorkflowSteps(r.status);
      const statusLabel = MONTHLY_REPORT_STATUS_LABELS[r.status] ?? r.status;
      const canSubmit = canStudentSubmitReport(r, reps);
      const lockedHint = getLockedMonthHint(r, reps);

      const line = [
        `Month ${r.month_number} JUST report`,
        `status=${statusLabel} (${r.status})`,
        `period=${r.period_start} to ${r.period_end}`,
        `due=${dueDateLabel(r.due_date)} (${r.due_date})`,
        `workflow=Student:${steps.student} Employer:${steps.employer} Supervisor:${steps.supervisor}`,
        canSubmit ? "student_can_edit=yes" : "student_can_edit=no",
        lockedHint ? `lock_reason=${lockedHint}` : "",
        r.rejection_reason ? `revision_requested=${norm(r.rejection_reason, 300)}` : "",
        r.assignments?.trim() ? "assignments=started" : "assignments=empty",
        r.work_summary?.trim() ? "work_summary=started" : "work_summary=empty",
        `weekly_sections=${weeksFilled}/${weekList.length} complete`,
        attPct != null ? `attendance_this_month=${attPct}%` : "",
        `form_url=/dashboard/student/internship-reports/${internshipId}/month/${r.month_number}`,
        r.status === "approved" ? `pdf=/api/internship-reports/${r.id}/pdf` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      reportSummaryLines.push(line);

      internshipBlocks.push(
        [
          `  MONTH_${r.month_number}:`,
          `    report_id=${r.id}`,
          `    status=${statusLabel} (${r.status})`,
          `    period=${r.period_start} → ${r.period_end}`,
          `    due=${r.due_date} (${dueDateLabel(r.due_date)})`,
          `    student_can_submit=${canSubmit ? "yes" : "no"}`,
          lockedHint ? `    locked_hint=${lockedHint}` : "",
          r.rejection_reason ? `    rejection_reason=${norm(r.rejection_reason, 400)}` : "",
          `    part1_progress=assignments:${r.assignments?.trim() ? "yes" : "no"} summary:${r.work_summary?.trim() ? "yes" : "no"} weeks:${weeksFilled}/${weekList.length}`,
          attPct != null ? `    attendance_summary=${attPct}% present rate (employer-managed)` : "",
          `    workflow_student=${steps.student} employer=${steps.employer} supervisor=${steps.supervisor}`,
          `    open_form=/dashboard/student/internship-reports/${internshipId}/month/${r.month_number}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }

    if (reps.length === 0 && raw.status === "pending_supervisor_approval") {
      internshipBlocks.push("  MONTHLY_REPORTS: not generated yet — waiting for supervisor to approve tracking.");
      reportSummaryLines.push("Monthly reports pending — supervisor must approve internship tracking first.");
    }

    if (reps.length > 0 && allMonthlyReportsApproved(reps)) {
      reportSummaryLines.push(
        `All ${reps.length} monthly reports approved for ${companyName}.` +
          (internshipPeriodComplete(raw.end_date)
            ? " Internship ended — final report upload available."
            : ` Final report unlocks after ${raw.end_date}.`)
      );
    }
  }

  const contextBlock = [
    MONTHLY_REPORTS_WORKFLOW_GUIDE,
    "=== YOUR_INTERNSHIP_TRACKING & MONTHLY REPORTS (live data for this student) ===",
    internshipBlocks.join("\n\n"),
  ].join("\n\n");

  return {
    contextBlock,
    reportSummaryLines,
    hasInternshipTracking: true,
  };
}

const REPORT_KEYWORDS =
  /\b(report|reports|monthly|just|internship tracking|part i|part ii|employer evaluation|supervisor approval|attendance|final report|weekly|submission|submit|revision|overdue|unlocked)\b/i;

export function isReportRelatedQuestion(message: string): boolean {
  return REPORT_KEYWORDS.test(message);
}

/** Lightweight retrieval: rank report lines by keyword overlap with the question (no extra API calls). */
export function rankReportLinesForQuestion(lines: string[], message: string, topK = 6): string[] {
  const words = message
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  if (!words.length) return [];

  const scored = lines
    .map((line) => {
      const lower = line.toLowerCase();
      const score = words.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
      return { line, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map((x) => x.line);
}
