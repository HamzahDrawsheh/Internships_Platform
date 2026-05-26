import { fmt } from "@/lib/i18n/format";
import type { InternshipTrackSummary } from "@/lib/internship-reports/track-summary";
import { formatTrackDuration } from "@/lib/internship-reports/track-summary";

type TFn = (key: string) => string;

const STATUS_KEYS: Record<string, string> = {
  Completed: "dashboard.student.statusCompleted",
  "Awaiting approval": "dashboard.student.statusAwaitingApproval",
  "In progress": "dashboard.student.statusInProgress",
};

/** Localize internship track hint strings produced by buildInternshipTrackSummary. */
export function localizeTrackHint(hint: string, t: TFn): string {
  let match: RegExpMatchArray | null;

  match = hint.match(/^1 monthly report needs your attention\.$/);
  if (match) return t("dashboard.student.oneReportAttention");

  match = hint.match(/^(\d+) monthly reports need your attention\.$/);
  if (match) return fmt(t("dashboard.student.reportsAttention"), { count: match[1] });

  match = hint.match(/^All (\d+) months approved · (\d+) days left\.$/);
  if (match) return fmt(t("dashboard.student.allMonthsApprovedDaysLeft"), { total: match[1], days: match[2] });

  if (hint === "All monthly reports approved.") return t("dashboard.student.allReportsApproved");

  match = hint.match(/^(\d+) month left to complete · (\d+) days remaining\.$/);
  if (match) return fmt(t("dashboard.student.oneMonthLeftComplete"), { days: match[2] });

  match = hint.match(/^(\d+) months left to complete · (\d+) days remaining\.$/);
  if (match) return fmt(t("dashboard.student.monthsLeftComplete"), { months: match[1], days: match[2] });

  match = hint.match(/^1 monthly report still to finish\.$/);
  if (match) return t("dashboard.student.oneReportStillToFinish");

  match = hint.match(/^(\d+) monthly reports still to finish\.$/);
  if (match) return fmt(t("dashboard.student.reportsStillToFinish"), { count: match[1] });

  match = hint.match(/^Internship in progress · (\d+) days left\.$/);
  if (match) return fmt(t("dashboard.student.internshipInProgressDays"), { days: match[1] });

  if (hint === "Internship period ended.") return t("dashboard.student.internshipPeriodEnded");

  match = hint.match(/^(\d+) of (\d+) months approved\.$/);
  if (match) return fmt(t("dashboard.student.monthsApproved"), { approved: match[1], total: match[2] });

  if (hint === "Training finished — well done!") return t("dashboard.student.trainingFinished");

  if (hint === "Your supervisor must approve tracking before monthly reports begin.") {
    return t("dashboard.student.supervisorApproveHint");
  }

  return hint;
}

export function localizeTrackStatusLabel(statusLabel: string, t: TFn): string {
  const key = STATUS_KEYS[statusLabel];
  return key ? t(key) : statusLabel;
}

export function localizeTrackDuration(startDate: string, endDate: string, t: TFn): string {
  const raw = formatTrackDuration(startDate, endDate);
  const weeksMatch = raw.match(/^(\d+) weeks$/);
  if (weeksMatch) return fmt(t("dashboard.student.weeksDuration"), { n: weeksMatch[1] });
  const daysMatch = raw.match(/^(\d+) days$/);
  if (daysMatch) return fmt(t("dashboard.student.daysDuration"), { n: daysMatch[1] });
  return raw;
}

export function localizeTrackCardLabels(track: InternshipTrackSummary, t: TFn) {
  const completedLabel = fmt(t("dashboard.student.percentComplete"), { pct: track.overallPercent });

  let remainingLabel: string;
  if (track.overallPercent >= 100) {
    remainingLabel = t("dashboard.student.done");
  } else if (track.reportTotal > 0) {
    remainingLabel = fmt(t("dashboard.student.monthsRemaining"), {
      left: track.reportTotal - track.reportApproved,
      total: track.reportTotal,
    });
  } else if (track.daysLeft != null) {
    remainingLabel = fmt(t("dashboard.student.daysRemaining"), { days: track.daysLeft });
  } else {
    remainingLabel = t("dashboard.student.statusInProgress");
  }

  const reportsApprovedLabel =
    track.reportTotal > 0
      ? fmt(t("dashboard.student.reportsApprovedLine"), {
          approved: track.reportApproved,
          total: track.reportTotal,
        })
      : null;

  return { completedLabel, remainingLabel, reportsApprovedLabel };
}
