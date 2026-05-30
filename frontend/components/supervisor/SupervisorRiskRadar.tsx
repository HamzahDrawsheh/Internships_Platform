"use client";

import Link from "next/link";
import { Badge, Button, EmptyState, Table } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { SupervisorFilter } from "@/components/supervisor/SupervisorQuickFilters";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

export type SupervisorRiskRadarProps = {
  hasDepartment: boolean;
  supervisorDepartment: string;
  selectedFilter: SupervisorFilter;
};

type RiskPriority = "high" | "medium" | "low";
type RiskType =
  | "pending_applications"
  | "missing_monthly_report"
  | "monthly_report_awaiting_approval"
  | "low_score"
  | "missing_skills"
  | "inactive";

type RiskRow = {
  studentId: string;
  studentUserId: string;
  studentName: string;
  reasons: Array<{ type: RiskType; label: string }>;
  priority: RiskPriority;
  suggestedAction: string;
  viewHref: string;
};

type StudentRow = { id: string; user_id: string; department: string | null };
type ProfileRow = { id: string; full_name: string | null };
type ApplicationRow = { student_id: string; status: string };
type InternshipRow = { id: string; student_id: string; status: string; updated_at?: string | null };
type MonthlyReportRow = {
  internship_id: string;
  status: string;
  due_date: string | null;
  period_start: string;
  period_end: string;
  updated_at?: string | null;
  student_submission_date?: string | null;
  employer_submission_date?: string | null;
  supervisor_approval_date?: string | null;
};

type RiskSourceCounts = {
  pendingApplications: number;
  missingReports: number;
  lowScore: number;
  missingSkills: number;
  noRecentActivity: number;
};

function priorityLabelKey(p: RiskPriority): string {
  if (p === "high") return "supervisor.dashboard.radarPriority.high";
  if (p === "medium") return "supervisor.dashboard.radarPriority.medium";
  return "supervisor.dashboard.radarPriority.low";
}

function priorityBadgeVariant(p: RiskPriority): "danger" | "warning" | "default" {
  if (p === "high") return "danger";
  if (p === "medium") return "warning";
  return "default";
}

function isDateBeforeToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  return d.getTime() < endOfToday.getTime();
}

function isNowWithinPeriod(periodStartIso: string, periodEndIso: string): boolean {
  const now = new Date();
  const start = new Date(periodStartIso);
  const end = new Date(periodEndIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

export function SupervisorRiskRadar({
  hasDepartment,
  supervisorDepartment,
  selectedFilter,
}: SupervisorRiskRadarProps) {
  const { t } = useI18n();

  if (!hasDepartment) {
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [rows, setRows] = useState<RiskRow[]>([]);
  const [sourceCounts, setSourceCounts] = useState<RiskSourceCounts>({
    pendingApplications: 0,
    missingReports: 0,
    lowScore: 0,
    missingSkills: 0,
    noRecentActivity: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setHasError(false);

      try {
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, user_id, department")
          .eq("department", supervisorDepartment)
          .order("created_at", { ascending: false });

        if (studentsError) throw studentsError;

        const safeStudents = (students ?? []) as StudentRow[];
        const studentIds = safeStudents.map((s) => s.id);
        const userIds = safeStudents.map((s) => s.user_id);

        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
          : { data: [] as ProfileRow[], error: null };

        if (profilesError) {
          // Don't crash radar if profile names fail; just fallback to "—"
          console.warn("[SupervisorRiskRadar] profiles:", profilesError.message);
        }

        const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));

        const { data: applications, error: appsError } = studentIds.length
          ? await supabase.from("applications").select("student_id, status").in("student_id", studentIds)
          : { data: [] as ApplicationRow[], error: null };

        if (appsError) {
          console.warn("[SupervisorRiskRadar] applications:", appsError.message);
        }

        const pendingByStudent = new Map<string, number>();
        for (const app of (applications ?? []) as ApplicationRow[]) {
          if (app.status === "pending") {
            pendingByStudent.set(app.student_id, (pendingByStudent.get(app.student_id) ?? 0) + 1);
          }
        }

        const { data: internships, error: internshipsError } = studentIds.length
          ? await supabase
              .from("internships")
              .select("id, student_id, status, updated_at")
              .in("student_id", studentIds)
              .eq("status", "active")
          : { data: [] as InternshipRow[], error: null };

        if (internshipsError) {
          console.warn("[SupervisorRiskRadar] internships:", internshipsError.message);
        }

        const activeInternships = (internships ?? []) as InternshipRow[];
        const internshipIds = activeInternships.map((i) => i.id);

        const { data: monthlyReports, error: monthlyError } = internshipIds.length
          ? await supabase
              .from("internship_monthly_reports")
              .select(
                "internship_id, status, due_date, period_start, period_end, updated_at, student_submission_date, employer_submission_date, supervisor_approval_date",
              )
              .in("internship_id", internshipIds)
          : { data: [] as MonthlyReportRow[], error: null };

        if (monthlyError) {
          console.warn("[SupervisorRiskRadar] monthly reports:", monthlyError.message);
        }

        const currentMonthReportByInternship = new Map<string, MonthlyReportRow>();
        for (const r of (monthlyReports ?? []) as MonthlyReportRow[]) {
          if (isNowWithinPeriod(r.period_start, r.period_end)) {
            currentMonthReportByInternship.set(r.internship_id, r);
          }
        }

        const riskRows: RiskRow[] = [];
        const counts: RiskSourceCounts = {
          pendingApplications: 0,
          missingReports: 0,
          lowScore: 0,
          missingSkills: 0,
          noRecentActivity: 0,
        };

        // Low score / missing skills are included ONLY if data is accessible under RLS.
        // This project currently exposes only department-level aggregates to supervisors; per-student rows are typically hidden.
        const lowScoreByStudent = new Map<string, number>();
        const missingSkillsByStudent = new Map<string, number>();

        // No recent activity (14+ days) uses monthly report timestamps (allowed to supervisors via internship access).
        const lastActivityByStudent = new Map<string, number>();
        const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        for (const i of activeInternships) {
          const sid = i.student_id;
          let best = lastActivityByStudent.get(sid) ?? 0;
          const internUpdated = i.updated_at ? new Date(i.updated_at).getTime() : NaN;
          if (Number.isFinite(internUpdated)) best = Math.max(best, internUpdated);

          for (const r of (monthlyReports ?? []) as MonthlyReportRow[]) {
            if (r.internship_id !== i.id) continue;
            const candidates = [r.updated_at, r.student_submission_date, r.employer_submission_date, r.supervisor_approval_date];
            for (const c of candidates) {
              const ts = c ? new Date(c).getTime() : NaN;
              if (Number.isFinite(ts)) best = Math.max(best, ts);
            }
          }
          if (best > 0) lastActivityByStudent.set(sid, best);
        }

        for (const st of safeStudents) {
          const profile = profileByUserId.get(st.user_id);
          const name = profile?.full_name?.trim() || "—";

          const reasons: RiskRow["reasons"] = [];
          let priority: RiskPriority = "low";
          let suggestedAction = t("supervisor.dashboard.radarActionViewStudent");

          const pendingCount = pendingByStudent.get(st.id) ?? 0;
          if (pendingCount > 0) {
            reasons.push({
              type: "pending_applications",
              label: fmt(t("supervisor.dashboard.radarReasonPendingApps"), { count: pendingCount }),
            });
            priority = "medium";
            suggestedAction = t("supervisor.dashboard.radarActionReviewPending");
            counts.pendingApplications += 1;
          }

          const activeInternshipForStudent = activeInternships.find((i) => i.student_id === st.id);
          if (activeInternshipForStudent) {
            const reportRow = currentMonthReportByInternship.get(activeInternshipForStudent.id) ?? null;
            const missingReport = !reportRow;
            const lateReport =
              reportRow &&
              (reportRow.status === "overdue" ||
                ((reportRow.status === "unlocked" || reportRow.status === "pending_student") &&
                  isDateBeforeToday(reportRow.due_date)));
            const awaitingSupervisor = reportRow && reportRow.status === "pending_supervisor";

            if (missingReport || lateReport) {
              reasons.unshift({
                type: "missing_monthly_report",
                label: t("supervisor.dashboard.radarReasonMissingReport"),
              });
              priority = "high";
              suggestedAction = t("supervisor.dashboard.radarActionReviewMonthly");
              counts.missingReports += 1;
            } else if (awaitingSupervisor) {
              reasons.unshift({
                type: "monthly_report_awaiting_approval",
                label: t("supervisor.dashboard.radarReasonMonthlyAwaitingApproval"),
              });
              // At this point `priority` can only be "low" or "medium" (no other sources raise it to "high" yet).
              priority = "medium";
              suggestedAction = t("supervisor.dashboard.radarActionReviewMonthly");
              counts.missingReports += 1;
            }
          }

          const lowScore = lowScoreByStudent.get(st.id);
          if (typeof lowScore === "number") {
            const p: RiskPriority = lowScore < 0.4 ? "high" : lowScore < 0.5 ? "medium" : "low";
            if (p === "high") priority = "high";
            else if (p === "medium" && priority !== "high") priority = "medium";
            reasons.push({ type: "low_score", label: fmt(t("supervisor.dashboard.radarReasonLowScore"), { score: lowScore.toFixed(2) }) });
            suggestedAction = t("supervisor.dashboard.radarActionViewStudent");
            counts.lowScore += 1;
          }

          const missingSkills = missingSkillsByStudent.get(st.id);
          if (typeof missingSkills === "number") {
            if (missingSkills >= 5) priority = "high";
            else if (missingSkills >= 3 && priority !== "high") priority = "medium";
            reasons.push({
              type: "missing_skills",
              label: fmt(t("supervisor.dashboard.radarReasonMissingSkills"), { count: missingSkills }),
            });
            suggestedAction = t("supervisor.dashboard.radarActionViewStudent");
            counts.missingSkills += 1;
          }

          const lastActivity = lastActivityByStudent.get(st.id) ?? 0;
          if (lastActivity > 0 && nowMs - lastActivity >= fourteenDaysMs) {
            reasons.push({
              type: "inactive",
              label: fmt(t("supervisor.dashboard.radarReasonNoRecentActivity"), { days: 14 }),
            });
            if (priority === "low") priority = "low";
            counts.noRecentActivity += 1;
          }

          if (reasons.length === 0) continue;

          riskRows.push({
            studentId: st.id,
            studentUserId: st.user_id,
            studentName: name,
            reasons,
            priority,
            suggestedAction,
            viewHref: `/supervisor/students/${st.id}`,
          });
        }

        if (!cancelled) {
          setRows(riskRows);
          setSourceCounts(counts);
          setLoading(false);
        }
      } catch (e) {
        console.error("[SupervisorRiskRadar] load error:", e);
        if (!cancelled) {
          setHasError(true);
          setRows([]);
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [supervisorDepartment, t]);

  const filteredRows = useMemo(() => {
    if (selectedFilter === "all") return rows;
    if (selectedFilter === "at_risk") return rows.filter((r) => r.priority === "high" || r.priority === "medium");
    if (selectedFilter === "missing_reports")
      return rows.filter((r) =>
        r.reasons.some((x) => x.type === "missing_monthly_report" || x.type === "monthly_report_awaiting_approval"),
      );
    if (selectedFilter === "low_score") return rows.filter((r) => r.reasons.some((x) => x.type === "low_score"));
    if (selectedFilter === "pending") return rows.filter((r) => r.reasons.some((x) => x.type === "pending_applications"));
    if (selectedFilter === "active") return [];
    if (selectedFilter === "completed") return [];
    return [];
  }, [rows, selectedFilter]);

  const summary = useMemo(() => {
    const high = filteredRows.filter((r) => r.priority === "high").length;
    const medium = filteredRows.filter((r) => r.priority === "medium").length;
    const total = filteredRows.length;
    return { high, medium, total };
  }, [filteredRows]);

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("supervisor.dashboard.riskRadarTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("supervisor.dashboard.riskRadarSubtitleStudents")}
          </p>
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
            <p className="font-medium text-gray-700 dark:text-gray-200">Debug (risk sources)</p>
            <div className="mt-1 grid gap-1 sm:grid-cols-2">
              <p>Pending application risks: {sourceCounts.pendingApplications}</p>
              <p>Missing report risks: {sourceCounts.missingReports}</p>
              <p>Low score risks: {sourceCounts.lowScore}</p>
              <p>Missing skills risks: {sourceCounts.missingSkills}</p>
              <p>No recent activity risks: {sourceCounts.noRecentActivity}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="danger" className="shadow-sm">
            {fmt(t("supervisor.dashboard.radarHighCount"), { count: summary.high })}
          </Badge>
          <Badge variant="warning" className="shadow-sm">
            {fmt(t("supervisor.dashboard.radarMediumCount"), { count: summary.medium })}
          </Badge>
          <Badge variant="default" className="shadow-sm">
            {fmt(t("supervisor.dashboard.radarTotalCount"), { count: summary.total })}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40"
            />
          ))}
        </div>
      ) : hasError ? (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {t("supervisor.dashboard.radarLoadError")}
        </p>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          className="mt-5"
          title={rows.length === 0 ? t("supervisor.dashboard.radarAllClearTitle") : t("supervisor.dashboard.radarNoMatchTitle")}
          description={rows.length === 0 ? t("supervisor.dashboard.radarAllClearDesc") : t("supervisor.dashboard.radarNoMatchDesc")}
        />
      ) : (
        <div className="mt-5">
          <Table
            headers={[
              t("supervisor.dashboard.radarColStudent"),
              t("supervisor.dashboard.radarColReason"),
              t("supervisor.dashboard.radarColPriority"),
              t("supervisor.dashboard.radarColAction"),
              t("supervisor.dashboard.radarColView"),
            ]}
            className="rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80"
          >
            {filteredRows.slice(0, 10).map((r) => (
              <tr key={r.studentId} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-4 py-4 text-sm font-medium text-purple-700 dark:text-purple-300">
                  {r.studentName}
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                  {r.reasons.map((x) => x.label).join(" · ")}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    variant={priorityBadgeVariant(r.priority)}
                    className={r.priority === "high" ? "ring-1 ring-red-500/20" : r.priority === "medium" ? "ring-1 ring-amber-500/20" : ""}
                  >
                    {t(priorityLabelKey(r.priority))}
                  </Badge>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{r.suggestedAction}</td>
                <td className="px-4 py-4">
                  <Link href={r.viewHref}>
                    <Button variant="secondary" className="whitespace-nowrap">
                      {t("supervisor.dashboard.radarView")}
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </Table>
          {filteredRows.length > 10 ? (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {fmt(t("supervisor.dashboard.radarShowingMax"), { count: 10, total: filteredRows.length })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

