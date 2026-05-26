"use client";

import { ProgressDonutChart } from "@/components/dashboard/ProgressDonutChart";

type Props = {
  reportApproved: number;
  reportTotal: number;
  label: string;
};

export function TrainingProgressBreakdownChart({
  reportApproved,
  reportTotal,
  label,
}: Props) {
  if (reportTotal <= 0) return null;

  const percent = Math.round((reportApproved / reportTotal) * 100);

  return (
    <div className="flex w-full max-w-[240px] flex-col items-center gap-3">
      <ProgressDonutChart
        percent={percent}
        centerText={`${reportApproved}/${reportTotal}`}
        label={label}
        size={112}
        stroke={10}
      />
      <div className="flex w-full gap-1">
        {Array.from({ length: reportTotal }, (_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i < reportApproved
                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                : "bg-emerald-100 dark:bg-emerald-900/40"
            }`}
            title={`Month ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
