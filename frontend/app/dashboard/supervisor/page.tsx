"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Container } from "@/components/layout/Container";
import { SupervisorAiInsights } from "@/components/supervisor/SupervisorAiInsights";
import { DashboardReportWidget } from "@/components/internship-reports/DashboardReportWidget";
import { DashboardStatCard, DashboardStatGrid } from "@/components/dashboard/DashboardStatCard";
import { RoleOverviewTrackCard } from "@/components/dashboard/RoleOverviewTrackCard";
import { DashboardPageSkeleton, StatCardsSkeleton } from "@/components/loading";
import { Button, EmptyState, Modal, Table } from "@/components/ui";
import { SmartActionCenter } from "@/components/supervisor/SmartActionCenter";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";
import { SupervisorQuickFilters, type SupervisorFilter } from "@/components/supervisor/SupervisorQuickFilters";
import { SupervisorRiskRadar } from "@/components/supervisor/SupervisorRiskRadar";
import { SupervisorFilteredResults } from "@/components/supervisor/SupervisorFilteredResults";

type PreviewStudent = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  university: string;
  department: string;
  major: string;
};

export default function SupervisorDashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [selectedFilter, setSelectedFilter] = useState<SupervisorFilter>("all");
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState("User");
  /** `undefined` = not loaded yet; empty string = loaded but no department */
  const [supervisorDepartment, setSupervisorDepartment] = useState<string | undefined>(undefined);
  const [assignedStudents, setAssignedStudents] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [completedInternships, setCompletedInternships] = useState(0);
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([]);
  const [departmentInsightsEligible, setDepartmentInsightsEligible] = useState(false);

  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [gettingStartedStep, setGettingStartedStep] = useState(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const loadDashboard = async () => {
      setLoading(true);
      setErrorKey(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor dashboard getUser error:", userError);
        setErrorKey("loadAccountError");
        setSupervisorDepartment(undefined);
        setLoading(false);
        return;
      }
      if (!user) {
        setErrorKey("loginRequired");
        setSupervisorDepartment(undefined);
        setLoading(false);
        return;
      }
      const emailPrefix = user.email?.split("@")[0]?.trim() || "User";
      const resolvedName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
        emailPrefix;
      setSupervisorName(resolvedName);

      const { data: supervisor, error: supervisorError } = await supabase
        .from("supervisors")
        .select("id, department")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor dashboard supervisor query error:", supervisorError);
        setDepartmentInsightsEligible(false);
        setErrorKey("loadProfileError");
        setSupervisorDepartment(undefined);
        setLoading(false);
        return;
      }

      if (!supervisor?.department?.trim()) {
        setDepartmentInsightsEligible(false);
        setSupervisorDepartment("");
        setAssignedStudents(0);
        setTotalApplications(0);
        setAcceptedApplications(0);
        setPendingApplications(0);
        setCompletedInternships(0);
        setPreviewStudents([]);
        setLoading(false);
        return;
      }

      const dept = supervisor.department.trim();
      setSupervisorDepartment(dept);
      setDepartmentInsightsEligible(true);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major, created_at")
        .eq("department", dept)
        .order("created_at", { ascending: false });

      if (studentsError) {
        console.error("supervisor dashboard students query error:", studentsError);
        setErrorKey("loadStudentsError");
        setLoading(false);
        return;
      }

      const safeStudents =
        (studentsData ?? []) as {
          id: string;
          user_id: string;
          university: string | null;
          department: string | null;
          major: string | null;
          created_at: string;
        }[];
      setAssignedStudents(safeStudents.length);

      if (safeStudents.length === 0) {
        setTotalApplications(0);
        setAcceptedApplications(0);
        setPendingApplications(0);
        setCompletedInternships(0);
        setPreviewStudents([]);
        setLoading(false);
        return;
      }

      const studentIds = safeStudents.map((student) => student.id);
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("applications")
        .select("status, student_id")
        .in("student_id", studentIds);
      if (applicationsError) {
        console.error("supervisor dashboard applications query error:", applicationsError);
      }

      type AppStatus = "pending" | "accepted" | "rejected" | "completed";
      const safeApplications = (applicationsData ?? []) as { status: AppStatus; student_id: string }[];
      setTotalApplications(safeApplications.length);
      setAcceptedApplications(safeApplications.filter((application) => application.status === "accepted").length);
      setPendingApplications(safeApplications.filter((application) => application.status === "pending").length);
      setCompletedInternships(safeApplications.filter((application) => application.status === "completed").length);

      const profileIds = [...new Set(safeStudents.map((student) => student.user_id))];
      const { data: profilesData, error: profilesError } = profileIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", profileIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };
      if (profilesError) {
        console.error("supervisor dashboard profiles query error:", profilesError);
      }

      const profileByUserId = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
      const mappedPreview: PreviewStudent[] = safeStudents.slice(0, 5).map((student) => {
        const profile = profileByUserId.get(student.user_id);
        return {
          id: student.id,
          user_id: student.user_id,
          full_name: profile?.full_name?.trim() || "—",
          email: profile?.email ?? "—",
          university: student.university ?? "—",
          department: student.department ?? "—",
          major: student.major ?? "—",
        };
      });
      setPreviewStudents(mappedPreview);

      const { data: activeInternships } = await supabase
        .from("internships")
        .select("id")
        .in("student_id", studentIds)
        .eq("status", "active");
      let pendingApprovals = 0;
      for (const i of activeInternships ?? []) {
        await syncInternshipReportStatuses(supabase, i.id);
        const { count } = await supabase
          .from("internship_monthly_reports")
          .select("*", { count: "exact", head: true })
          .eq("internship_id", i.id)
          .eq("status", "pending_supervisor");
        pendingApprovals += count ?? 0;
      }
      setPendingApprovalCount(pendingApprovals);

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const hasDepartment = supervisorDepartment !== undefined && supervisorDepartment.length > 0;

  const gettingStartedSteps = useMemo(() => {
    const deptDone = hasDepartment;
    const rosterDone = assignedStudents > 0;
    const appsDone = totalApplications > 0;
    const noPendingHighlight = pendingApplications === 0 && totalApplications > 0;

    return [
      {
        title: t("supervisor.dashboard.stepDeptTitle"),
        description: t("supervisor.dashboard.stepDeptDesc"),
        complete: deptDone,
        ctaLabel: deptDone ? t("supervisor.dashboard.stepDeptCtaDone") : t("supervisor.dashboard.stepDeptCtaTodo"),
        href: "/supervisor/profile",
      },
      {
        title: t("supervisor.dashboard.stepRosterTitle"),
        description: t("supervisor.dashboard.stepRosterDesc"),
        complete: rosterDone,
        ctaLabel: rosterDone ? t("supervisor.dashboard.stepRosterCtaOpen") : t("supervisor.dashboard.stepRosterCta"),
        href: "/supervisor/students",
      },
      {
        title: t("supervisor.dashboard.stepMonitorTitle"),
        description: t("supervisor.dashboard.stepMonitorDesc"),
        complete: appsDone,
        ctaLabel: t("supervisor.dashboard.stepMonitorCta"),
        href: "/supervisor/reports",
      },
      {
        title: t("supervisor.dashboard.stepPendingTitle"),
        description:
          pendingApplications > 0
            ? fmt(
                pendingApplications === 1
                  ? t("supervisor.dashboard.stepPendingDescOne")
                  : t("supervisor.dashboard.stepPendingDescMany"),
                { count: pendingApplications },
              )
            : totalApplications === 0
              ? t("supervisor.dashboard.stepPendingDescEmpty")
              : t("supervisor.dashboard.stepPendingDescNone"),
        complete: noPendingHighlight || totalApplications === 0,
        ctaLabel:
          pendingApplications > 0 ? t("supervisor.dashboard.stepPendingCta") : t("supervisor.dashboard.stepMonitorCta"),
        href: pendingApplications > 0 ? "/supervisor/reports?status=pending" : "/supervisor/reports",
      },
      {
        title: t("supervisor.dashboard.stepInsightsTitle"),
        description:
          departmentInsightsEligible && hasDepartment
            ? t("supervisor.dashboard.stepInsightsDescReady")
            : t("supervisor.dashboard.stepInsightsDescLocked"),
        complete: false,
        ctaLabel: t("supervisor.dashboard.stepInsightsCta"),
        scrollToInsights: true as const,
      },
    ] as Array<{
      title: string;
      description: string;
      complete: boolean;
      ctaLabel: string;
      href?: string;
      scrollToInsights?: true;
    }>;
  }, [
    t,
    hasDepartment,
    assignedStudents,
    totalApplications,
    pendingApplications,
    departmentInsightsEligible,
  ]);

  const showEmptyStudents = useMemo(
    () => !loading && !errorKey && assignedStudents === 0,
    [loading, errorKey, assignedStudents],
  );

  const completionRateLabel = useMemo(() => {
    if (totalApplications === 0) return "—";
    const pct = (completedInternships / totalApplications) * 100;
    return `${pct.toFixed(1)}%`;
  }, [totalApplications, completedInternships]);

  const pendingReportsHref = "/supervisor/reports?status=pending";

  const welcomeSubtitle = useMemo(() => {
    if (pendingApprovalCount > 0) {
      return fmt(
        pendingApprovalCount === 1
          ? t("supervisor.dashboard.pendingReportsOne")
          : t("supervisor.dashboard.pendingReportsMany"),
        { count: pendingApprovalCount },
      );
    }
    if (pendingApplications > 0) {
      return fmt(
        pendingApplications === 1
          ? t("supervisor.dashboard.pendingAppsOne")
          : t("supervisor.dashboard.pendingAppsMany"),
        { count: pendingApplications },
      );
    }
    if (completedInternships > 0 && totalApplications > 0) {
      return fmt(t("supervisor.dashboard.completedRatio"), {
        completed: completedInternships,
        total: totalApplications,
      });
    }
    return t("supervisor.dashboard.monitorActivity");
  }, [t, pendingApprovalCount, pendingApplications, completedInternships, totalApplications]);

  const departmentProgress = useMemo(() => {
    if (totalApplications === 0) return null;
    const pct = Math.round((completedInternships / totalApplications) * 100);
    const active = acceptedApplications;
    const remaining = Math.max(0, totalApplications - completedInternships);
    let hint = fmt(t("supervisor.dashboard.progressHint"), {
      completed: completedInternships,
      active,
      pending: pendingApplications,
    });
    if (pendingApprovalCount > 0) {
      hint = fmt(
        pendingApprovalCount === 1
          ? t("supervisor.dashboard.reportsSignoffOne")
          : t("supervisor.dashboard.reportsSignoffMany"),
        { count: pendingApprovalCount },
      );
    }
    return { pct, remaining, hint };
  }, [
    t,
    totalApplications,
    completedInternships,
    acceptedApplications,
    pendingApplications,
    pendingApprovalCount,
  ]);

  const progressSubtitle = useMemo(
    () =>
      fmt(t("supervisor.dashboard.progressSubtitle"), {
        students: assignedStudents,
        studentsLabel:
          assignedStudents === 1
            ? t("supervisor.dashboard.studentSingular")
            : t("supervisor.dashboard.studentPlural"),
        applications: totalApplications,
        applicationsLabel:
          totalApplications === 1
            ? t("supervisor.dashboard.applicationSingular")
            : t("supervisor.dashboard.applicationPlural"),
      }),
    [t, assignedStudents, totalApplications],
  );

  const openStudentRow = (studentId: string) => {
    router.push(`/supervisor/students/${studentId}`);
  };

  const handleStudentRowKeyDown = (event: KeyboardEvent, studentId: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openStudentRow(studentId);
    }
  };

  return (
    <div>
      <Container>
        <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
                {fmt(t("supervisor.dashboard.welcomeBack"), { name: supervisorName })}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{welcomeSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                disabled={loading}
                onClick={() => {
                  setGettingStartedStep(0);
                  setGettingStartedOpen(true);
                }}
              >
                {t("supervisor.dashboard.gettingStarted")}
              </Button>
              <Link
                href="/supervisor/students"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                {t("supervisor.dashboard.studentsBtn")}
              </Link>
              <Link
                href="/supervisor/reports"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                {t("supervisor.dashboard.reportsBtn")}
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <DashboardReportWidget
            count={pendingApprovalCount}
            href="/supervisor/internship-reports"
            label={
              pendingApprovalCount === 1
                ? t("supervisor.dashboard.approvalPending")
                : t("supervisor.dashboard.approvalsPending")
            }
          />
        </div>

        {loading ? (
          <StatCardsSkeleton className="mt-6" />
        ) : errorKey ? null : (
          <>
            {!hasDepartment && supervisorDepartment !== undefined ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-medium">{t("supervisor.dashboard.finishSetupTitle")}</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                  {t("supervisor.dashboard.finishSetupDesc")}
                </p>
                <Link
                  href="/supervisor/profile"
                  className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline underline-offset-2 hover:no-underline dark:text-amber-200"
                >
                  {t("supervisor.dashboard.openSupervisorProfile")}
                </Link>
              </div>
            ) : null}

            <section className="mt-6">
              <DashboardStatGrid>
                <DashboardStatCard
                  label={t("supervisor.dashboard.studentsDepartment")}
                  value={assignedStudents}
                  tone="purple"
                />
                <DashboardStatCard
                  label={t("supervisor.dashboard.pending")}
                  value={pendingApplications}
                  tone="amber"
                  href={pendingApplications > 0 ? pendingReportsHref : undefined}
                />
                <DashboardStatCard
                  label={t("supervisor.dashboard.active")}
                  value={acceptedApplications}
                  tone="green"
                />
                <DashboardStatCard
                  label={t("supervisor.dashboard.completed")}
                  value={completedInternships}
                  tone="sky"
                />
              </DashboardStatGrid>
            </section>
          </>
        )}

        <SupervisorQuickFilters
          hasDepartment={hasDepartment}
          supervisorDepartmentLabel={supervisorDepartment ?? ""}
          assignedStudents={assignedStudents}
          pendingApplications={pendingApplications}
          pendingApprovalCount={pendingApprovalCount}
          selectedFilter={selectedFilter}
          onChangeFilter={setSelectedFilter}
        />

        <SupervisorFilteredResults
          hasDepartment={hasDepartment}
          supervisorDepartment={supervisorDepartment ?? ""}
          selectedFilter={selectedFilter}
        />

        <Modal
          isOpen={gettingStartedOpen}
          onClose={() => setGettingStartedOpen(false)}
          title={fmt(t("supervisor.dashboard.gettingStartedProgress"), {
            step: gettingStartedStep + 1,
            total: gettingStartedSteps.length,
          })}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setGettingStartedStep((s) => Math.max(0, s - 1))}
                disabled={gettingStartedStep === 0}
              >
                {t("common.back")}
              </Button>
              {gettingStartedSteps[gettingStartedStep]?.href ? (
                <Link href={gettingStartedSteps[gettingStartedStep]!.href!}>
                  <Button variant="secondary">{t("common.open")}</Button>
                </Link>
              ) : gettingStartedSteps[gettingStartedStep]?.scrollToInsights ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGettingStartedOpen(false);
                    document.getElementById("supervisor-ai-insights")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {t("supervisor.dashboard.goToInsights")}
                </Button>
              ) : null}
              <Button
                variant="primary"
                onClick={() => {
                  if (gettingStartedStep >= gettingStartedSteps.length - 1) {
                    setGettingStartedOpen(false);
                  } else {
                    setGettingStartedStep((s) => Math.min(gettingStartedSteps.length - 1, s + 1));
                  }
                }}
              >
                {gettingStartedStep >= gettingStartedSteps.length - 1 ? t("common.finish") : t("common.next")}
              </Button>
            </>
          }
        >
          {(() => {
            const step = gettingStartedSteps[gettingStartedStep];
            if (!step) return null;
            return (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{step.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        step.complete
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      }`}
                    >
                      {step.complete ? t("supervisor.dashboard.done") : t("supervisor.dashboard.todo")}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">{t("supervisor.dashboard.yourChecklist")}</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {gettingStartedSteps.map((s, idx) => (
                      <li key={s.title} className={idx === gettingStartedStep ? "font-medium" : ""}>
                        {s.title}{" "}
                        <span className="opacity-70">
                          ({s.complete ? t("supervisor.dashboard.doneStatus") : t("supervisor.dashboard.todoStatus")})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 text-sm text-gray-700 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-gray-200">
                  {t("supervisor.dashboard.gettingStartedTip")}
                </div>
              </div>
            );
          })()}
        </Modal>

        {loading ? (
          <DashboardPageSkeleton showWelcome={false} showTrack showTable statCount={0} className="mt-8" />
        ) : errorKey ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {t(`supervisor.dashboard.${errorKey}`)}
          </p>
        ) : (
          <>
            {departmentProgress ? (
              <section className="mt-8">
                <RoleOverviewTrackCard
                  title={t("supervisor.dashboard.departmentProgress")}
                  subtitle={progressSubtitle}
                  overallPercent={departmentProgress.pct}
                  completedLabel={completionRateLabel}
                  remainingLabel={fmt(t("supervisor.dashboard.remaining"), { count: departmentProgress.remaining })}
                  hint={departmentProgress.hint}
                  href="/supervisor/reports"
                  linkLabel={t("supervisor.dashboard.openDepartmentReports")}
                />
              </section>
            ) : null}

            <SupervisorRiskRadar
              hasDepartment={hasDepartment}
              supervisorDepartment={supervisorDepartment ?? ""}
              selectedFilter={selectedFilter}
            />

            <SmartActionCenter
              hasDepartment={hasDepartment}
              assignedStudents={assignedStudents}
              pendingApplications={pendingApplications}
              pendingApprovalCount={pendingApprovalCount}
              totalApplications={totalApplications}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t("supervisor.dashboard.studentsOverview")}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t("supervisor.dashboard.studentsOverviewDesc")}
              </p>
              {showEmptyStudents ? (
                <EmptyState
                  className="mt-4"
                  title={t("supervisor.dashboard.noDataYet")}
                  description={t("supervisor.dashboard.noStudentsDept")}
                  actionLabel={t("supervisor.dashboard.viewStudents")}
                  actionHref="/supervisor/students"
                />
              ) : previewStudents.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t("supervisor.dashboard.noDataYet")}</p>
              ) : (
                <Table
                  headers={[
                    t("supervisor.dashboard.colStudent"),
                    t("supervisor.dashboard.colEmail"),
                    t("supervisor.dashboard.colUniversity"),
                    t("supervisor.dashboard.colDepartment"),
                    t("supervisor.dashboard.colMajor"),
                  ]}
                  className="mt-4 rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80 [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-gray-500 dark:[&_th]:text-gray-300 [&_tbody]:bg-white dark:[&_tbody]:bg-gray-900"
                >
                  {previewStudents.map((student) => (
                    <tr
                      key={student.id}
                      tabIndex={0}
                      role="link"
                      aria-label={fmt(t("supervisor.dashboard.openStudent"), { name: student.full_name })}
                      className="cursor-pointer transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      onClick={() => openStudentRow(student.id)}
                      onKeyDown={(e) => handleStudentRowKeyDown(e, student.id)}
                    >
                      <td className="px-4 py-4 text-sm font-medium text-purple-700 underline-offset-2 hover:underline dark:text-purple-300">
                        {student.full_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.university}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.department}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.major}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>

            <div id="supervisor-ai-insights">
              <SupervisorAiInsights eligible={departmentInsightsEligible} className="mt-8" />
            </div>
          </>
        )}
      </Container>
    </div>
  );
}
