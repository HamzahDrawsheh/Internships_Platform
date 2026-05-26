"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/context";

export function SupervisorProfileAvatar({ name, className = "" }: { name: string; className?: string }) {
  const initial = (name.trim() || "S").slice(0, 1).toUpperCase();

  return (
    <div
      className={`flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white/30 bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg ${className}`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

export function SupervisorProfileHero({
  name,
  subtitle,
  badge,
  completeness,
  stats,
  action,
}: {
  name: string;
  subtitle?: string;
  badge?: string;
  completeness: number;
  stats: { label: string; value: string }[];
  action?: ReactNode;
}) {
  const { t } = useI18n();
  const pct = Math.max(0, Math.min(100, completeness));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-violet-200/40 dark:border-violet-500/20 dark:shadow-violet-900/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <SupervisorProfileAvatar name={name} className="h-16 w-16 sm:h-20 sm:w-20 sm:text-3xl" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                {name.trim() || t("supervisor.profile.supervisorFallback")}
              </h1>
              {subtitle ? <p className="mt-1 text-sm text-violet-100/90">{subtitle}</p> : null}
              {badge ? (
                <span className="mt-3 inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {badge}
                </span>
              ) : null}
            </div>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 text-xs font-medium text-violet-100/90">
            <span>{t("supervisor.profile.profileCompleteness")}</span>
            <span className="tabular-nums text-white">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-white to-fuchsia-200 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm"
              >
                <p className="text-lg font-bold tabular-nums text-white">{stat.value}</p>
                <p className="text-xs font-medium text-violet-100/80">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function computeSupervisorProfileCompleteness(fields: {
  fullName: string;
  department: string;
  title: string;
  university: string;
  officeLocation: string;
}): number {
  const checks = [
    Boolean(fields.fullName.trim()),
    Boolean(fields.department.trim()),
    Boolean(fields.title.trim()),
    Boolean(fields.university.trim()),
    Boolean(fields.officeLocation.trim()),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
