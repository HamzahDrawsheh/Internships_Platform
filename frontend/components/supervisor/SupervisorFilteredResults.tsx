"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState, Table } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";
import type { SupervisorFilter } from "@/components/supervisor/SupervisorQuickFilters";

export type SupervisorFilteredResultsProps = {
  hasDepartment: boolean;
  supervisorDepartment: string;
  selectedFilter: SupervisorFilter;
};

type RiskPriority = "high" | "medium" | "low";
type RiskType = "missing_report" | "pending_review" | "low_score" | "missing_skills" | "inactive";

type StudentRow = { id: string; user_id: string; department: string | null; created_at: string };
type ProfileRow = { id: string; full_name: string | null; email: string | null };
type ApplicationRow = { id: string; student_id: string; status: "pending" | "accepted" | "rejected" | "completed" };
type InternshipRow = { id: string; student_id: string; status: string };
type MonthlyReportRow = {
  internship_id: string;
  status: string;
  due_date: string | null;
  period_start: string;
  period_end: string;
};
type FeedbackAnalysisRow = { overall_score: number | null; sentiment: string | null; feedback_id: string };

type FilterRow = {
  key: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  reason: string;
  meta?: string;
  href?: string;
  tone?: "danger" | "warning" | "default";
};

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

function badgeForTone(tone: NonNullable<FilterRow["tone"]>) {
  if (tone === "danger") return "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200";
  if (tone === "warning") return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-100";
}

/**
 * Filter → data source mapping (no fake data; relies on existing dashboard sources):
 * - all: union/overview across all the below (applications + monthly reports + risk logic)
 * - at_risk: same logic as `SupervisorRiskRadar` (students + applications + active internships + current month report missing/late)
 * - pending: `applications` rows with status = pending for department students
 * - active: `applications` rows with status = accepted for department students (matches dashboard "active" stat card)
 * - completed: `applications` rows with status = completed for department students (matches dashboard "completed" stat card)
 * - missing_reports: same missing/late monthly report logic as `SupervisorRiskRadar` for active internships
 * - low_score: attempts `feedback_analysis` overall_score threshold, but may be blocked by RLS (supervisors typically cannot read raw rows)
 */
export function SupervisorFilteredResults({
  hasDepartment,
  supervisorDepartment,
  selectedFilter,
}: SupervisorFilteredResultsProps) {
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [rlsBlocked, setRlsBlocked] = useState(false);
  const [rows, setRows] = useState<FilterRow[]>([]);

  useEffect(() => {
    if (!hasDepartment) return;

    const supabase = createClient();
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setHasError(false);
      setRlsBlocked(false);
      setRows([]);

      try {
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("id, user_id, department, created_at")
          .eq("department", supervisorDepartment)
          .order("created_at", { ascending: false });

        if (studentsError) throw studentsError;

        const safeStudents = (students ?? []) as StudentRow[];
        const studentIds = safeStudents.map((s) => s.id);
        const userIds = safeStudents.map((s) => s.user_id);

        if (studentIds.length === 0) {
          if (!cancelled) {
            setRows([]);
            setLoading(false);
          }
          return;
        }

        const { data: profiles, error: profilesError } = userIds.length
          ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
          : { data: [] as ProfileRow[], error: null };
        if (profilesError) {
          // non-fatal
          console.warn("[SupervisorFilteredResults] profiles:", profilesError.message);
        }

        const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));

        // Applications backing pending/active/completed counts.
        const { data: applications, error: appsError } = await supabase
          .from("applications")
          .select("id, student_id, status")
          .in("student_id", studentIds);

        if (appsError) {
          console.warn("[SupervisorFilteredResults] applications:", appsError.message);
        }

        const safeApps = (applications ?? []) as ApplicationRow[];

        // Active internships + monthly reports are used for missing_reports and part of at_risk.
        const { data: internships, error: internshipsError } = await supabase
          .from("internships")
          .select("id, student_id, status")
          .in("student_id", studentIds)
          .eq("status", "active");

        if (internshipsError) {
          console.warn("[SupervisorFilteredResults] internships:", internshipsError.message);
        }

        const activeInternships = (internships ?? []) as InternshipRow[];
        const internshipIds = activeInternships.map((i) => i.id);

        const { data: monthlyReports, error: monthlyError } = internshipIds.length
          ? await supabase
              .from("internship_monthly_reports")
              .select("internship_id, status, due_date, period_start, period_end")
              .in("internship_id", internshipIds)
          : { data: [] as MonthlyReportRow[], error: null };

        if (monthlyError) {
          console.warn("[SupervisorFilteredResults] monthly reports:", monthlyError.message);
        }

        const currentMonthReportByInternship = new Map<string, MonthlyReportRow>();
        for (const r of (monthlyReports ?? []) as MonthlyReportRow[]) {
          if (isNowWithinPeriod(r.period_start, r.period_end)) {
            currentMonthReportByInternship.set(r.internship_id, r);
          }
        }

        const studentName = (st: StudentRow) => profileByUserId.get(st.user_id)?.full_name?.trim() || "—";
        const studentEmail = (st: StudentRow) => profileByUserId.get(st.user_id)?.email?.trim() || undefined;

        const pendingByStudent = new Map<string, number>();
        for (const app of safeApps) {
          if (app.status === "pending") {
            pendingByStudent.set(app.student_id, (pendingByStudent.get(app.student_id) ?? 0) + 1);
          }
        }

        const makeAppRows = (status: ApplicationRow["status"]): FilterRow[] => {
          const byStudent = new Map<string, number>();
          for (const app of safeApps) {
            if (app.status === status) {
              byStudent.set(app.student_id, (byStudent.get(app.student_id) ?? 0) + 1);
            }
          }
          return safeStudents
            .filter((s) => (byStudent.get(s.id) ?? 0) > 0)
            .map((s) => ({
              key: `${status}:${s.id}`,
              studentId: s.id,
              studentName: studentName(s),
              studentEmail: studentEmail(s),
              reason:
                status === "pending"
                  ? fmt(t("supervisor.dashboard.filteredResultsReasonPendingApplications"), {
                      count: byStudent.get(s.id) ?? 0,
                    })
                  : status === "accepted"
                    ? fmt(t("supervisor.dashboard.filteredResultsReasonActiveApplications"), {
                        count: byStudent.get(s.id) ?? 0,
                      })
                    : status === "completed"
                      ? fmt(t("supervisor.dashboard.filteredResultsReasonCompletedApplications"), {
                          count: byStudent.get(s.id) ?? 0,
                        })
                      : t("supervisor.dashboard.filteredResultsReasonApplicationGeneric"),
              href: `/supervisor/students/${s.id}`,
              tone: status === "pending" ? "warning" : status === "accepted" ? "default" : "default",
            }));
        };

        const missingReportRows = (): FilterRow[] => {
          const rowsOut: FilterRow[] = [];
          for (const st of safeStudents) {
            const activeInternshipForStudent = activeInternships.find((i) => i.student_id === st.id);
            if (!activeInternshipForStudent) continue;
            const reportRow = currentMonthReportByInternship.get(activeInternshipForStudent.id) ?? null;
            const missingReport = !reportRow;
            const lateReport =
              reportRow &&
              (reportRow.status === "overdue" ||
                ((reportRow.status === "unlocked" || reportRow.status === "pending_student") &&
                  isDateBeforeToday(reportRow.due_date)));

            if (!missingReport && !lateReport) continue;

            rowsOut.push({
              key: `missing_reports:${st.id}`,
              studentId: st.id,
              studentName: studentName(st),
              studentEmail: studentEmail(st),
              reason: missingReport
                ? t("supervisor.dashboard.filteredResultsReasonMissingReport")
                : t("supervisor.dashboard.filteredResultsReasonLateReport"),
              meta: reportRow?.due_date
                ? fmt(t("supervisor.dashboard.filteredResultsDueDateMeta"), { date: reportRow.due_date })
                : undefined,
              href: `/supervisor/students/${st.id}`,
              tone: "danger",
            });
          }
          return rowsOut;
        };

        const atRiskRows = (): FilterRow[] => {
          const rowsOut: FilterRow[] = [];
          for (const st of safeStudents) {
            const reasons: Array<{ type: RiskType; label: string }> = [];
            let priority: RiskPriority = "low";

            const pendingCount = pendingByStudent.get(st.id) ?? 0;
            if (pendingCount > 0) {
              reasons.push({
                type: "pending_review",
                label: fmt(t("supervisor.dashboard.radarReasonPendingApps"), { count: pendingCount }),
              });
              priority = "medium";
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

              if (missingReport || lateReport) {
                reasons.unshift({
                  type: "missing_report",
                  label: t("supervisor.dashboard.radarReasonMissingReport"),
                });
                priority = "high";
              }
            }

            if (reasons.length === 0) continue;

            rowsOut.push({
              key: `at_risk:${st.id}`,
              studentId: st.id,
              studentName: studentName(st),
              studentEmail: studentEmail(st),
              reason: reasons.map((r) => r.label).join(" · "),
              meta:
                priority === "high"
                  ? t("supervisor.dashboard.radarPriority.high")
                  : priority === "medium"
                    ? t("supervisor.dashboard.radarPriority.medium")
                    : t("supervisor.dashboard.radarPriority.low"),
              href: `/supervisor/students/${st.id}`,
              tone: priority === "high" ? "danger" : priority === "medium" ? "warning" : "default",
            });
          }
          return rowsOut;
        };

        const lowScoreRows = async (): Promise<FilterRow[]> => {
          // Most projects have RLS that blocks supervisors from raw feedback rows.
          // We attempt a direct query; if blocked, we surface the explicit "no accessible records" state.
          const LOW_SCORE_THRESHOLD = 0.5;
          try {
            const { data, error } = await supabase
              .from("feedback_analysis")
              .select("feedback_id, overall_score, sentiment")
              .lt("overall_score", LOW_SCORE_THRESHOLD)
              .limit(50);

            if (error) {
              if (error.code === "42501" || /not authorized|permission/i.test(error.message)) {
                setRlsBlocked(true);
                return [];
              }
              console.warn("[SupervisorFilteredResults] low_score query:", error.message);
              return [];
            }

            const safe = (data ?? []) as FeedbackAnalysisRow[];
            if (safe.length === 0) return [];

            // Map feedback rows back to students in this department using student_training_evaluations -> applications -> students.
            // NOTE: this join is likely blocked by RLS as well; we keep the UI stable if it's inaccessible.
            const evalIds = safe.map((r) => r.feedback_id);
            const { data: evaluations, error: evalError } = await supabase
              .from("student_training_evaluations")
              .select("id, student_id")
              .in("id", evalIds);

            if (evalError) {
              if (evalError.code === "42501" || /not authorized|permission/i.test(evalError.message)) {
                setRlsBlocked(true);
                return [];
              }
              console.warn("[SupervisorFilteredResults] low_score eval map:", evalError.message);
              return [];
            }

            const evalToStudent = new Map((evaluations ?? []).map((e: { id: string; student_id: string }) => [e.id, e.student_id]));
            const scoreByStudent = new Map<string, number>();
            for (const r of safe) {
              const sid = evalToStudent.get(r.feedback_id);
              const score = typeof r.overall_score === "number" ? r.overall_score : Number(r.overall_score ?? NaN);
              if (!sid || !Number.isFinite(score)) continue;
              const existing = scoreByStudent.get(sid);
              if (existing == null || score < existing) scoreByStudent.set(sid, score);
            }

            return safeStudents
              .filter((s) => scoreByStudent.has(s.id))
              .map((s) => ({
                key: `low_score:${s.id}`,
                studentId: s.id,
                studentName: studentName(s),
                studentEmail: studentEmail(s),
                reason: t("supervisor.dashboard.filteredResultsReasonLowScore"),
                meta: fmt(t("supervisor.dashboard.filteredResultsLowScoreMeta"), {
                  score: Math.round((scoreByStudent.get(s.id)! * 1000) / 10) / 100,
                }),
                href: `/supervisor/students/${s.id}`,
                tone: "warning",
              }));
          } catch (e) {
            console.warn("[SupervisorFilteredResults] low_score exception:", e);
            return [];
          }
        };

        let nextRows: FilterRow[] = [];

        if (selectedFilter === "pending") nextRows = makeAppRows("pending");
        else if (selectedFilter === "active") nextRows = makeAppRows("accepted");
        else if (selectedFilter === "completed") nextRows = makeAppRows("completed");
        else if (selectedFilter === "missing_reports") nextRows = missingReportRows();
        else if (selectedFilter === "at_risk") nextRows = atRiskRows();
        else if (selectedFilter === "low_score") nextRows = await lowScoreRows();
        else {
          // "all": show an overview (not a duplicated static list)
          const pending = makeAppRows("pending");
          const active = makeAppRows("accepted");
          const completed = makeAppRows("completed");
          const missing = missingReportRows();
          const atRisk = atRiskRows();

          nextRows = [
            ...missing.slice(0, 5),
            ...pending.slice(0, 5),
            ...atRisk.slice(0, 5),
            ...active.slice(0, 5),
            ...completed.slice(0, 5),
          ];

          if (nextRows.length > 0) {
            nextRows.unshift({
              key: "overview:header",
              studentId: "",
              studentName: t("supervisor.dashboard.filteredResultsOverviewTitle"),
              reason: fmt(t("supervisor.dashboard.filteredResultsOverviewSubtitle"), {
                missing: missing.length,
                pending: pending.length,
                atRisk: atRisk.length,
                active: active.length,
                completed: completed.length,
              }),
              href: "/supervisor/reports",
              tone: "default",
            });
          }
        }

        if (!cancelled) {
          setRows(nextRows);
          setLoading(false);
        }
      } catch (e) {
        console.error("[SupervisorFilteredResults] load error:", e);
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
  }, [hasDepartment, supervisorDepartment, selectedFilter, t]);

  if (!hasDepartment) return null;

  const showOverviewHeader = rows[0]?.key === "overview:header";
  const listRows = showOverviewHeader ? rows.slice(1) : rows;

  return (
    <section
      id="filtered-results"
      className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/90"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("supervisor.dashboard.filteredResultsTitle")}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("supervisor.dashboard.currentFilterDebug")}{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{selectedFilter}</span>
          </p>
        </div>
        <Link href="/supervisor/reports">
          <Button variant="secondary">{t("supervisor.dashboard.actionsOpenReports")}</Button>
        </Link>
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
          {t("supervisor.dashboard.filteredResultsLoadError")}
        </p>
      ) : rlsBlocked && selectedFilter === "low_score" ? (
        <EmptyState
          className="mt-5"
          title={t("supervisor.dashboard.filteredResultsNoAccessibleTitle")}
          description={t("supervisor.dashboard.filteredResultsNoAccessibleDesc")}
        />
      ) : showOverviewHeader ? (
        <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-400/20 dark:bg-purple-500/10">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rows[0]!.studentName}</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{rows[0]!.reason}</p>
          {listRows.length === 0 ? (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {t("supervisor.dashboard.filteredResultsEmptyDesc")}
            </p>
          ) : (
            <div className="mt-4">
              <Table
                headers={[
                  t("supervisor.dashboard.filtered.colStudent"),
                  t("supervisor.dashboard.filtered.colReason"),
                  t("supervisor.dashboard.filtered.colMeta"),
                  t("supervisor.dashboard.filtered.colAction"),
                ]}
                className="rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80"
              >
                {listRows.map((r) => (
                  <tr key={r.key} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="px-4 py-4 text-sm font-medium text-purple-700 dark:text-purple-300">
                      <div className="min-w-0">
                        <div className="truncate">{r.studentName}</div>
                        {r.studentEmail ? <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{r.studentEmail}</div> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{r.reason}</td>
                    <td className="px-4 py-4">
                      {r.meta ? (
                        <Badge className={badgeForTone(r.tone ?? "default")}>{r.meta}</Badge>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {r.href ? (
                        <Link href={r.href}>
                          <Button variant="secondary" className="whitespace-nowrap">
                            {t("supervisor.reports.view")}
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="secondary" disabled className="whitespace-nowrap">
                          {t("supervisor.reports.view")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      ) : listRows.length === 0 ? (
        <EmptyState
          className="mt-5"
          title={t("supervisor.dashboard.filteredResultsEmptyTitle")}
          description={
            rlsBlocked
              ? t("supervisor.dashboard.filteredResultsNoAccessibleDesc")
              : t("supervisor.dashboard.filteredResultsEmptyDesc")
          }
        />
      ) : (
        <div className="mt-5">
          <Table
            headers={[
              t("supervisor.dashboard.filtered.colStudent"),
              t("supervisor.dashboard.filtered.colReason"),
              t("supervisor.dashboard.filtered.colMeta"),
              t("supervisor.dashboard.filtered.colAction"),
            ]}
            className="rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80"
          >
            {listRows.slice(0, 15).map((r) => (
              <tr key={r.key} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-4 py-4 text-sm font-medium text-purple-700 dark:text-purple-300">
                  <div className="min-w-0">
                    <div className="truncate">{r.studentName}</div>
                    {r.studentEmail ? <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{r.studentEmail}</div> : null}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{r.reason}</td>
                <td className="px-4 py-4">
                  {r.meta ? (
                    <Badge className={badgeForTone(r.tone ?? "default")}>{r.meta}</Badge>
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {r.href ? (
                    <Link href={r.href}>
                      <Button variant="secondary" className="whitespace-nowrap">
                        {t("supervisor.reports.view")}
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="secondary" disabled className="whitespace-nowrap">
                      {t("supervisor.reports.view")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          {listRows.length > 15 ? (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              {fmt(t("supervisor.dashboard.filteredResultsShowingMax"), { count: 15, total: listRows.length })}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

