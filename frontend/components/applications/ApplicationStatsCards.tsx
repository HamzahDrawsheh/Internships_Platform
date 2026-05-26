"use client";

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
    {
      label: t("dashboard.student.totalApplications"),
      value: total,
      cardClass: "bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300",
    },
    {
      label: t("dashboard.student.pending"),
      value: pending,
      cardClass: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-300",
    },
    {
      label: t("dashboard.student.active"),
      value: active,
      cardClass: "bg-green-100 text-green-900 dark:bg-green-500/10 dark:text-green-300",
    },
    {
      label: t("dashboard.student.completed"),
      value: completed,
      cardClass: "bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-300",
    },
  ];

  return (
    <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((item, idx) => (
        <article
          key={item.label}
          className={`animate-fade-up rounded-2xl p-6 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${item.cardClass}`}
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <p className="text-sm font-medium">{item.label}</p>
          <p className="mt-4 text-3xl font-bold">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
