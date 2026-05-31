"use client";

import { MetricStatCard, MetricStatGrid } from "@/components/dashboard/MetricStatCard";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  total: number;
  pending: number;
  active: number;
  completed: number;
};

export function ApplicationStatsCards({ total, pending, active, completed }: Props) {
  const { t } = useI18n();

  const stats = [
    { label: t("dashboard.student.totalApplications"), value: total, tone: "purple" as const },
    { label: t("dashboard.student.pending"), value: pending, tone: "amber" as const },
    { label: t("dashboard.student.active"), value: active, tone: "green" as const },
    { label: t("dashboard.student.completed"), value: completed, tone: "sky" as const },
  ];

  return (
    <MetricStatGrid className="mb-6">
      {stats.map((item) => (
        <MetricStatCard key={item.label} label={item.label} value={item.value} tone={item.tone} />
      ))}
    </MetricStatGrid>
  );
}
