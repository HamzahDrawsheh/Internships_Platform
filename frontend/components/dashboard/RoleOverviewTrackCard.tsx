"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type Props = {
  title: string;
  subtitle: string;
  overallPercent: number;
  completedLabel: string;
  remainingLabel: string;
  hint: string;
  href: string;
  linkLabel?: string;
};

export function RoleOverviewTrackCard({
  title,
  subtitle,
  overallPercent,
  completedLabel,
  remainingLabel,
  hint,
  href,
  linkLabel = "Open details →",
}: Props) {
  const { t } = useI18n();
  const progressLabel = fmt(t("dashboard.student.percentComplete"), { pct: overallPercent });

  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 shadow-sm transition-all duration-300 hover:border-violet-300 hover:shadow-md dark:border-violet-500/30 dark:from-violet-950/40 dark:via-gray-900 dark:to-indigo-950/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-violet-800 dark:text-violet-200">{completedLabel}</span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-gray-100">{progressLabel}</span>
          <span className="text-gray-500 dark:text-gray-400">{remainingLabel}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, overallPercent))}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-sm text-violet-900/90 dark:text-violet-200/90">{hint}</p>
      <p className="mt-3 text-xs font-medium text-violet-700 group-hover:underline dark:text-violet-300">{linkLabel}</p>
    </Link>
  );
}
