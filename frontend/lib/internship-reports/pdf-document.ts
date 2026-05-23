import { jsPDF } from "jspdf";
import type { AttendanceRow, EmployerEvaluationRow, MonthlyReportRow, WeeklyReportRow } from "./types";
import { computeAttendancePercentage, filterAttendanceForMonth } from "./helpers";

export type ReportPdfContext = {
  studentName: string;
  studentId: string;
  department: string;
  employerName: string;
  universitySupervisor: string;
  monthNumber: number;
  periodStart: string;
  periodEnd: string;
  assignments: string;
  workSummary: string;
  weeklyReports: WeeklyReportRow[];
  attendance: AttendanceRow[];
  evaluation: EmployerEvaluationRow | null;
  studentSignatureDataUrl?: string | null;
  employerSignatureDataUrl?: string | null;
  supervisorComments?: string | null;
  status: string;
};

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 5): number {
  const lines = doc.splitTextToSize(text || "—", maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function buildMonthlyReportPdf(ctx: ReportPdfContext): Uint8Array {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 15;
  const margin = 15;
  const width = 180;

  doc.setFontSize(14);
  doc.text("JUST — Monthly Internship Evaluation Report", margin, y);
  y += 10;
  doc.setFontSize(10);

  const info = [
    `Student: ${ctx.studentName}`,
    `Student ID: ${ctx.studentId}`,
    `Department: ${ctx.department}`,
    `Employer: ${ctx.employerName}`,
    `University Supervisor: ${ctx.universitySupervisor}`,
    `Month ${ctx.monthNumber}: ${ctx.periodStart} to ${ctx.periodEnd}`,
    `Status: ${ctx.status}`,
  ];
  info.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Part I — Student Section", margin, y);
  doc.setFont("helvetica", "normal");
  y += 6;

  doc.text("Assignment(s):", margin, y);
  y += 4;
  y = addWrappedText(doc, ctx.assignments, margin, y, width) + 4;

  doc.text("Summary of Assigned Work:", margin, y);
  y += 4;
  y = addWrappedText(doc, ctx.workSummary, margin, y, width) + 6;

  doc.text("Weekly Work Description:", margin, y);
  y += 5;
  ctx.weeklyReports
    .sort((a, b) => a.week_number - b.week_number)
    .forEach((w) => {
      doc.text(`Week ${w.week_number}:`, margin, y);
      y += 4;
      y = addWrappedText(doc, w.description, margin + 4, y, width - 4) + 4;
    });

  const monthAtt = filterAttendanceForMonth(ctx.attendance, ctx.periodStart, ctx.periodEnd);
  const attPct = computeAttendancePercentage(monthAtt);
  y += 2;
  doc.text(`Attendance (${attPct}%):`, margin, y);
  y += 5;
  monthAtt.slice(0, 12).forEach((a) => {
    doc.text(
      `${a.date} | ${a.attendance_status} | ${a.start_time?.slice(0, 5) ?? "—"}-${a.end_time?.slice(0, 5) ?? "—"} | ${a.total_hours ?? 0}h`,
      margin,
      y
    );
    y += 4;
  });
  if (monthAtt.length > 12) {
    doc.text(`… and ${monthAtt.length - 12} more days`, margin, y);
    y += 5;
  }

  if (y > 240) {
    doc.addPage();
    y = 15;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Part II — Employer Evaluation", margin, y);
  doc.setFont("helvetica", "normal");
  y += 6;

  if (ctx.evaluation) {
    const ev = ctx.evaluation;
    const fields: [string, string][] = [
      ["Relations with Others", ev.relations_with_others],
      ["Ability to Learn", ev.ability_to_learn],
      ["Dependability", ev.dependability],
      ["Over-All Performance", ev.overall_performance],
      ["Working Ethics", ev.work_ethics],
      ["Attitudes", ev.attitudes],
      ["Quality of Work", ev.quality_of_work],
      ["Attendance Record", ev.attendance_record],
    ];
    fields.forEach(([label, val]) => {
      doc.text(`${label}: ${val}`, margin, y);
      y += 5;
    });
    if (ev.advancement_traits) {
      y = addWrappedText(doc, `Advancement traits: ${ev.advancement_traits}`, margin, y, width) + 4;
    }
    if (ev.additional_remarks) {
      y = addWrappedText(doc, `Remarks: ${ev.additional_remarks}`, margin, y, width) + 4;
    }
  } else {
    doc.text("Employer evaluation pending.", margin, y);
    y += 6;
  }

  if (ctx.supervisorComments) {
    y += 4;
    doc.text("Supervisor comments:", margin, y);
    y += 4;
    y = addWrappedText(doc, ctx.supervisorComments, margin, y, width) + 4;
  }

  y += 6;
  if (ctx.studentSignatureDataUrl?.startsWith("data:image")) {
    try {
      doc.addImage(ctx.studentSignatureDataUrl, "PNG", margin, y, 40, 15);
      doc.text("Student signature", margin, y + 18);
    } catch {
      /* ignore invalid image */
    }
  }
  if (ctx.employerSignatureDataUrl?.startsWith("data:image")) {
    try {
      doc.addImage(ctx.employerSignatureDataUrl, "PNG", margin + 80, y, 40, 15);
      doc.text("Employer signature", margin + 80, y + 18);
    } catch {
      /* ignore */
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
