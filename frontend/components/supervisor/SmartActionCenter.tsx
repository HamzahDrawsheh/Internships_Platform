"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, EmptyState, StatusText } from "@/components/ui";
import { statusTextVariantClass } from "@/lib/ui/status-text";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { SupervisorFilter } from "@/components/supervisor/SupervisorQuickFilters";

export type SmartActionCenterProps = {
  hasDepartment: boolean;
  assignedStudents: number;
  pendingApplications: number;
  pendingApprovalCount: number;
  totalApplications: number;
  selectedFilter: SupervisorFilter;
  onFilterChange?: (filter: SupervisorFilter) => void;
};

type ActionItem = {
  key: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  count?: number;
  badge?: { label: string; tone: "urgent" | "info" | "success" };
  href?: string;
  cta: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledHint?: string;
};

function badgeTextClass(tone: NonNullable<ActionItem["badge"]>["tone"]) {
  if (tone === "urgent") return statusTextVariantClass("danger");
  if (tone === "success") return statusTextVariantClass("success");
  return statusTextVariantClass("info");
}

export function SmartActionCenter({
  hasDepartment,
  assignedStudents,
  pendingApplications,
  pendingApprovalCount,
  totalApplications,
  selectedFilter,
  onFilterChange,
}: SmartActionCenterProps) {
  const { t } = useI18n();
  const router = useRouter();

  const scrollToFilteredResults = () => {
    // Works on the supervisor dashboard page (client component).
    document.getElementById("filtered-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setFilterAndScroll = (filter: SupervisorFilter) => {
    onFilterChange?.(filter);
    // Wait a tick so filtered results re-render before scrolling.
    setTimeout(() => scrollToFilteredResults(), 0);
  };

  const actions: ActionItem[] = [];

  // Core actions requested (do not create broken links; prefer local filter changes when possible).
  actions.push({
    key: "view_at_risk_students",
    title: t("supervisor.dashboard.actionItems.atRiskTitle"),
    description: t("supervisor.dashboard.actionItems.atRiskDesc"),
    priority: "medium",
    badge: { label: t("supervisor.dashboard.actionsInfo"), tone: "info" },
    cta: t("supervisor.dashboard.actionItems.viewRisksCta"),
    onClick: onFilterChange ? () => setFilterAndScroll("at_risk") : undefined,
    disabled: !onFilterChange,
    disabledHint: t("supervisor.dashboard.actionItems.atRiskUnavailableHint"),
  });

  actions.push({
    key: "review_pending_applications",
    title: t("supervisor.dashboard.actionItems.reviewPendingTitle"),
    description: fmt(t("supervisor.dashboard.actionItems.reviewPendingDesc"), { count: pendingApplications }),
    priority: pendingApplications > 0 ? "medium" : "low",
    count: pendingApplications,
    badge: pendingApplications > 0 ? { label: t("supervisor.dashboard.actionsInfo"), tone: "info" } : undefined,
    cta: t("supervisor.dashboard.actionItems.reviewCta"),
    onClick: () => {
      // Prefer navigating to the dedicated supervisor applications monitoring page (valid route).
      router.push("/supervisor/reports?status=pending");
    },
    disabled: pendingApplications === 0,
    disabledHint: t("supervisor.dashboard.actionItems.noPendingHint"),
  });

  actions.push({
    key: "check_low_score",
    title: t("supervisor.dashboard.actionItems.lowScoreTitle"),
    description: t("supervisor.dashboard.actionItems.lowScoreDesc"),
    priority: "medium",
    badge: { label: t("supervisor.dashboard.actionsInfo"), tone: "info" },
    cta: t("supervisor.dashboard.actionItems.viewRisksCta"),
    onClick: onFilterChange ? () => setFilterAndScroll("low_score") : undefined,
    disabled: !onFilterChange,
    disabledHint: t("supervisor.dashboard.actionItems.lowScoreUnavailableHint"),
  });

  actions.push({
    key: "review_missing_monthly_reports",
    title: t("supervisor.dashboard.actionItems.missingReportsTitle"),
    description: fmt(t("supervisor.dashboard.actionItems.missingReportsDesc"), { count: pendingApprovalCount }),
    priority: pendingApprovalCount > 0 ? "high" : "low",
    count: pendingApprovalCount,
    badge: pendingApprovalCount > 0 ? { label: t("supervisor.dashboard.actionsUrgent"), tone: "urgent" } : undefined,
    cta: t("supervisor.dashboard.actionItems.reviewCta"),
    onClick:
      pendingApprovalCount > 0
        ? () => {
            // Dedicated monthly reports page exists; prefer navigation.
            router.push("/supervisor/internship-reports");
          }
        : undefined,
    disabled: pendingApprovalCount === 0,
    disabledHint: t("supervisor.dashboard.actionItems.noMissingReportsHint"),
  });

  actions.push({
    key: "generate_learning_plan",
    title: t("supervisor.dashboard.actionItems.learningPlanTitle"),
    description: t("supervisor.dashboard.actionItems.learningPlanDesc"),
    priority: "low",
    badge: { label: t("supervisor.dashboard.actionsSuccess"), tone: "success" },
    cta: t("supervisor.dashboard.actionItems.generateCta"),
    disabled: true,
    disabledHint: t("supervisor.dashboard.actionItems.learningPlanUnavailableHint"),
  });

  actions.push({
    key: "open_department_reports",
    title: t("supervisor.dashboard.actionItems.openReportsTitle"),
    description: t("supervisor.dashboard.actionItems.openReportsDesc"),
    priority: "low",
    badge: { label: t("supervisor.dashboard.actionsSuccess"), tone: "success" },
    onClick: () => router.push("/supervisor/reports"),
    cta: t("supervisor.dashboard.actionItems.openCta"),
  });

  if (!hasDepartment) {
    actions.push({
      key: "set_department",
      title: t("supervisor.dashboard.actionsSetDeptTitle"),
      description: t("supervisor.dashboard.actionsSetDeptDesc"),
      priority: "high",
      badge: { label: t("supervisor.dashboard.actionsUrgent"), tone: "urgent" },
      href: "/supervisor/profile",
      cta: t("supervisor.dashboard.actionsOpenProfile"),
    });
  }

  if (hasDepartment && assignedStudents === 0) {
    actions.push({
      key: "check_roster",
      title: t("supervisor.dashboard.actionsRosterTitle"),
      description: t("supervisor.dashboard.actionsRosterDesc"),
      priority: "medium",
      badge: { label: t("supervisor.dashboard.actionsInfo"), tone: "info" },
      href: "/supervisor/students",
      cta: t("supervisor.dashboard.actionsViewStudents"),
    });
  }

  if (hasDepartment && totalApplications === 0 && assignedStudents > 0) {
    actions.push({
      key: "monitor_first_apps",
      title: t("supervisor.dashboard.actionsMonitorTitle"),
      description: t("supervisor.dashboard.actionsMonitorDesc"),
      priority: "low",
      badge: { label: t("supervisor.dashboard.actionsSuccess"), tone: "success" },
      href: "/supervisor/reports",
      cta: t("supervisor.dashboard.actionsOpenReports"),
    });
  }

  const filteredActions = actions.filter((action) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "at_risk") return action.priority === "high" || action.priority === "medium";
    if (selectedFilter === "missing_reports") return action.key === "review_missing_monthly_reports";
    if (selectedFilter === "pending") return action.key === "review_pending_applications";
    if (selectedFilter === "active") return action.key === "open_department_reports";
    if (selectedFilter === "completed") return action.key === "monitor_first_apps";
    if (selectedFilter === "low_score") return action.key === "check_low_score";
    return true;
  });

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("supervisor.dashboard.actionCenterTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("supervisor.dashboard.actionCenterSubtitle")}
          </p>
        </div>
        <Link href="/supervisor/reports">
          <Button variant="secondary">{t("supervisor.dashboard.actionsOpenReports")}</Button>
        </Link>
      </div>

      {filteredActions.length === 0 ? (
        <EmptyState
          className="mt-5"
          title={t("supervisor.dashboard.actionsEmptyTitle")}
          description={t("supervisor.dashboard.actionsEmptyDesc")}
          actionLabel={t("supervisor.dashboard.reportsBtn")}
          actionHref="/supervisor/reports"
        />
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filteredActions.map((action) => (
            <div
              key={action.key}
              className="group rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-purple-50/60 hover:shadow-md dark:border-purple-400/20 dark:from-purple-500/10 dark:to-gray-900/20 dark:hover:bg-purple-500/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{action.title}</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{action.description}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {typeof action.count === "number" ? (
                    <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
                      {action.count}
                    </span>
                  ) : null}
                  {action.badge ? (
                    <span className={`text-xs ${badgeTextClass(action.badge.tone)}`}>{action.badge.label}</span>
                  ) : null}
                </div>
              </div>
              <div className="mt-4">
                {action.href && !action.disabled ? (
                  <Link href={action.href}>
                    <Button variant="primary" className="w-full">
                      {action.cta}
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={Boolean(action.disabled)}
                    onClick={action.disabled ? undefined : action.onClick}
                    title={action.disabled ? action.disabledHint : undefined}
                  >
                    {action.cta}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

