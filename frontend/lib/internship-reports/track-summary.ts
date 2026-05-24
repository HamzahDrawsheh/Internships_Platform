import type { MonthlyReportRow } from "./types";
import { progressPercent } from "./helpers";

export type InternshipTrackSummary = {
  overallPercent: number;
  reportApproved: number;
  reportTotal: number;
  reportPercent: number;
  timePercent: number;
  daysLeft: number | null;
  hint: string;
  statusLabel: string;
};

function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00`).getTime();
  const end = new Date(`${endIso}T23:59:59`).getTime();
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

function daysUntilEnd(endIso: string): number {
  const end = new Date(`${endIso}T23:59:59`).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
}

function timeProgressPercent(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

export function buildInternshipTrackSummary(
  reports: MonthlyReportRow[],
  startDate: string,
  endDate: string,
  internshipStatus: string,
  reportsNeedingAttention = 0,
): InternshipTrackSummary {
  const reportApproved = reports.filter((r) => r.status === "approved").length;
  const reportTotal = reports.length;
  const reportPercent = progressPercent(reports);
  const timePercent = timeProgressPercent(startDate, endDate);
  const daysLeft = daysUntilEnd(endDate);

  if (internshipStatus === "completed") {
    return {
      overallPercent: 100,
      reportApproved,
      reportTotal,
      reportPercent: reportTotal ? 100 : reportPercent,
      timePercent: 100,
      daysLeft: 0,
      statusLabel: "Completed",
      hint: "Training finished — well done!",
    };
  }

  if (internshipStatus === "pending_supervisor_approval") {
    return {
      overallPercent: 0,
      reportApproved,
      reportTotal,
      reportPercent,
      timePercent,
      daysLeft,
      statusLabel: "Awaiting approval",
      hint: "Your supervisor must approve tracking before monthly reports begin.",
    };
  }

  const monthsRemaining = Math.max(0, reportTotal - reportApproved);
  let hint: string;

  if (reportsNeedingAttention > 0) {
    hint =
      reportsNeedingAttention === 1
        ? "1 monthly report needs your attention."
        : `${reportsNeedingAttention} monthly reports need your attention.`;
  } else if (reportTotal > 0 && reportApproved === reportTotal) {
    hint = daysLeft > 0 ? `All ${reportTotal} months approved · ${daysLeft} days left.` : "All monthly reports approved.";
  } else if (monthsRemaining > 0 && daysLeft > 0) {
    hint = `${monthsRemaining} month${monthsRemaining === 1 ? "" : "s"} left to complete · ${daysLeft} days remaining.`;
  } else if (daysLeft === 0 && monthsRemaining > 0) {
    hint = `${monthsRemaining} monthly report${monthsRemaining === 1 ? "" : "s"} still to finish.`;
  } else if (reportTotal === 0) {
    hint = daysLeft > 0 ? `Internship in progress · ${daysLeft} days left.` : "Internship period ended.";
  } else {
    hint = `${reportApproved} of ${reportTotal} months approved.`;
  }

  const overallPercent =
    reportTotal > 0
      ? Math.round(reportPercent * 0.65 + timePercent * 0.35)
      : timePercent;

  return {
    overallPercent: Math.min(100, Math.max(0, overallPercent)),
    reportApproved,
    reportTotal,
    reportPercent,
    timePercent,
    daysLeft,
    statusLabel: internshipStatus === "active" ? "In progress" : internshipStatus.replace(/_/g, " "),
    hint,
  };
}

export function formatTrackDuration(startDate: string, endDate: string): string {
  const totalDays = daysBetween(startDate, endDate);
  const weeks = Math.round(totalDays / 7);
  return weeks >= 8 ? `${weeks} weeks` : `${totalDays} days`;
}
