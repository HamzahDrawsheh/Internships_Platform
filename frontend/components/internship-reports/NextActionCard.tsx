"use client";

import Link from "next/link";
import type { NextAction } from "@/lib/internship-reports/workflow";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

const urgencyStyles = {
  normal: "border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:border-purple-900/40 dark:from-purple-950/30 dark:to-indigo-950/20",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
  overdue: "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
};

type Props = {
  action: NextAction | null;
};

export function NextActionCard({ action }: Props) {
  const { lt } = useI18n();

  if (!action) return null;
  return (
    <div className={`rounded-2xl border p-5 ${urgencyStyles[action.urgency]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">{lt("Next action")}</p>
      <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{lt(action.title)}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{lt(action.description)}</p>
      <Link href={action.href} className="mt-4 inline-block">
        <Button variant="primary">{lt(action.ctaLabel)}</Button>
      </Link>
    </div>
  );
}
