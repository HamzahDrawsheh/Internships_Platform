"use client";

import { formatApplicationDeadlineLabel } from "@/lib/internships/application-deadline";
import { formatInternshipDateLabel, formatInternshipDateRange } from "@/lib/internships/dates";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  startDate?: string | null;
  endDate?: string | null;
  applicationDeadline?: string | null;
  /** Inline lines for cards; stacked labels for detail panels. */
  variant?: "compact" | "detail";
  className?: string;
};

export function InternshipScheduleSummary({
  startDate,
  endDate,
  applicationDeadline,
  variant = "compact",
  className = "",
}: Props) {
  const { t } = useI18n();

  const period = formatInternshipDateRange(startDate, endDate);
  const startLabel = formatInternshipDateLabel(startDate);
  const endLabel = formatInternshipDateLabel(endDate);
  const deadlineLabel = formatApplicationDeadlineLabel(applicationDeadline);

  if (variant === "detail") {
    const noneSet = !startLabel && !endLabel && !deadlineLabel;
    if (noneSet) {
      return <p className={`text-sm text-gray-500 dark:text-gray-400 ${className}`}>{t("browse.datesNotSet")}</p>;
    }
    return (
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("browse.startDate")}</span>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{startLabel ?? "—"}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("browse.endDate")}</span>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{endLabel ?? "—"}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">{t("browse.applicationDeadline")}</span>
          <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{deadlineLabel ?? "—"}</p>
        </div>
      </div>
    );
  }

  if (!period && !deadlineLabel && !startLabel && !endLabel) {
    return (
      <p className={`text-xs text-slate-400 dark:text-slate-500 ${className}`}>{t("browse.datesNotSet")}</p>
    );
  }

  return (
    <div className={`space-y-0.5 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      {period ? (
        <p>
          <span className="font-medium text-slate-700 dark:text-slate-300">{t("browse.internshipPeriod")}</span>{" "}
          {period}
        </p>
      ) : null}
      {deadlineLabel ? (
        <p>
          <span className="font-medium text-slate-700 dark:text-slate-300">{t("browse.applyBy")}</span> {deadlineLabel}
        </p>
      ) : startLabel || endLabel ? (
        <p className="text-slate-400 dark:text-slate-500">
          {!period && startLabel ? `${t("browse.startDate")}: ${startLabel}` : null}
          {!period && endLabel ? `${t("browse.endDate")}: ${endLabel}` : null}
        </p>
      ) : null}
    </div>
  );
}
