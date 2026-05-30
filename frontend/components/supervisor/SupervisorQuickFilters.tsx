"use client";

import Link from "next/link";
import { Button, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

export type SupervisorFilter =
  | "all"
  | "at_risk"
  | "pending"
  | "active"
  | "completed"
  | "missing_reports"
  | "low_score";

export type SupervisorQuickFiltersProps = {
  hasDepartment: boolean;
  supervisorDepartmentLabel: string;
  assignedStudents: number;
  pendingApplications: number;
  pendingApprovalCount: number;
  selectedFilter: SupervisorFilter;
  onChangeFilter: (filter: SupervisorFilter) => void;
};

export function SupervisorQuickFilters({
  hasDepartment,
  supervisorDepartmentLabel,
  assignedStudents,
  pendingApplications,
  pendingApprovalCount,
  selectedFilter,
  onChangeFilter,
}: SupervisorQuickFiltersProps) {
  const { t } = useI18n();

  const filters = [
    { value: "all" as const, label: t("supervisor.dashboard.filters.all") },
    { value: "at_risk" as const, label: t("supervisor.dashboard.filters.atRisk") },
    { value: "pending" as const, label: t("supervisor.dashboard.filters.pending") },
    { value: "active" as const, label: t("supervisor.dashboard.filters.active") },
    { value: "completed" as const, label: t("supervisor.dashboard.filters.completed") },
    { value: "missing_reports" as const, label: t("supervisor.dashboard.filters.missingReports") },
    { value: "low_score" as const, label: t("supervisor.dashboard.filters.lowScore") },
  ];

  if (!hasDepartment) {
    return (
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10">
        <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">
          {t("supervisor.dashboard.quickFiltersTitle")}
        </h2>
        <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/90">
          {t("supervisor.dashboard.quickFiltersDeptMissing")}
        </p>
        <div className="mt-4">
          <Link href="/supervisor/profile">
            <Button variant="secondary">{t("supervisor.dashboard.openSupervisorProfile")}</Button>
          </Link>
        </div>
      </section>
    );
  }

  const pendingAppsLabel =
    pendingApplications === 1
      ? fmt(t("supervisor.dashboard.pendingAppsOne"), { count: pendingApplications })
      : fmt(t("supervisor.dashboard.pendingAppsMany"), { count: pendingApplications });

  const pendingMonthlyLabel =
    pendingApprovalCount === 1
      ? fmt(t("supervisor.dashboard.pendingReportsOne"), { count: pendingApprovalCount })
      : fmt(t("supervisor.dashboard.pendingReportsMany"), { count: pendingApprovalCount });

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("supervisor.dashboard.quickFiltersTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {fmt(t("supervisor.dashboard.quickFiltersSubtitle"), {
              department: supervisorDepartmentLabel,
              students: assignedStudents,
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/supervisor/students">
            <Button variant="secondary">{t("supervisor.dashboard.quickFiltersStudents")}</Button>
          </Link>
          <Link href="/supervisor/reports?status=pending">
            <Button variant={pendingApplications > 0 ? "primary" : "secondary"}>
              {t("supervisor.dashboard.quickFiltersPendingApplications")}
            </Button>
          </Link>
          <Link href="/supervisor/internship-reports">
            <Button variant={pendingApprovalCount > 0 ? "primary" : "secondary"}>
              {t("supervisor.dashboard.quickFiltersPendingMonthlyReports")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto pb-1">
        <div className="flex w-max gap-2 px-1">
          {filters.map((f) => {
            const active = selectedFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onChangeFilter(f.value)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 ${
                  active
                    ? "border-purple-300 bg-gradient-to-r from-purple-100 to-fuchsia-50 text-purple-950 shadow-sm dark:border-purple-400/40 dark:from-purple-500/25 dark:to-fuchsia-500/10 dark:text-purple-50"
                    : "border-gray-200 bg-white text-gray-700 hover:border-purple-200 hover:bg-purple-50/40 hover:text-purple-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-purple-400/30 dark:hover:bg-purple-500/10 dark:hover:text-purple-200"
                }`}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
        {t("supervisor.dashboard.currentFilterDebug")}{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFilter}</span>
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 transition-colors duration-300 hover:bg-purple-50/60 dark:border-purple-400/20 dark:bg-purple-500/10 dark:hover:bg-purple-500/15">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
            {t("supervisor.dashboard.quickFiltersPendingAppsCard")}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{pendingAppsLabel}</p>
        </div>
        <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 transition-colors duration-300 hover:bg-purple-50/60 dark:border-purple-400/20 dark:bg-purple-500/10 dark:hover:bg-purple-500/15">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
            {t("supervisor.dashboard.quickFiltersPendingMonthlyCard")}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{pendingMonthlyLabel}</p>
        </div>
      </div>

      {assignedStudents === 0 ? (
        <EmptyState
          className="mt-5"
          title={t("supervisor.dashboard.noDataYet")}
          description={t("supervisor.dashboard.noStudentsDept")}
          actionLabel={t("supervisor.dashboard.viewStudents")}
          actionHref="/supervisor/students"
        />
      ) : null}
    </section>
  );
}

