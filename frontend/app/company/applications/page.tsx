"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { CardGridSkeleton, StatCardsSkeleton } from "@/components/loading";
import { DashboardStatCard, DashboardStatGrid } from "@/components/dashboard/DashboardStatCard";
import { notifyCompanyDashboardUpdated } from "@/lib/dashboard/company-dashboard-sync";
import { Badge, Button, EmptyState, Input, Modal, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import {
  buildCompanyApplicationStatusNotification,
  isValidCompanyDispatchPayload,
  type CompanyNotifyApplicationStatus,
} from "@/lib/notifications/company-application-status";
import { dispatchNotification } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase/client";
import { openCompanyApplicantCv } from "@/lib/open-company-cv";
import { MessageStudentButton } from "@/components/messaging/MessageStudentButton";
import {
  buildCompanyStatusPatch,
  canCompanyTransitionStatus,
  COMMITMENT_PENDING_STATUS,
} from "@/lib/applications/commitment";
import type { ApplicationStatus } from "@/lib/types";

type Position = { id: string; title: string; duration_weeks?: number | null };
type Application = {
  id: string;
  student_id: string;
  position_id: string;
  internship_title: string;
  status: ApplicationStatus;
  applied_at: string;
};
type StudentDetail = {
  userId: string;
  fullName: string;
  email: string;
  university: string;
  department: string;
  major: string;
  hasCv: boolean;
  year: string;
  bio: string;
  gpa: number | null;
  technicalSkills: string[];
  takenCourses: string[];
};

function formatAppliedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusLabel(status: ApplicationStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function CompanyApplicationsPage() {
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Company");
  const [positions, setPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [studentDetailById, setStudentDetailById] = useState<Map<string, StudentDetail>>(new Map());
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cvOpeningId, setCvOpeningId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ApplicationStatus>("");
  const [positionFilter, setPositionFilter] = useState("");
  const [hasCvFilter, setHasCvFilter] = useState<"" | "yes" | "no">("");

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("company applications user error:", userError);
        setError("Could not load your account.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Please login to view applications.");
        setLoading(false);
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("company applications company error:", JSON.stringify(companyError, null, 2));
        setError("Could not load company profile.");
        setLoading(false);
        return;
      }

      if (!company) {
        setCompanyId(null);
        setPositions([]);
        setApplications([]);
        setLoading(false);
        return;
      }
      setCompanyId(company.id);
      setCompanyName(company.company_name?.trim() || "Company");

      const { data: positionsData, error: positionsError } = await supabase
        .from("internship_positions")
        .select("id, title, duration_weeks")
        .eq("company_id", company.id);

      if (positionsError) {
        console.error("company applications positions error:", JSON.stringify(positionsError, null, 2));
        setError("Could not load internship posts.");
        setLoading(false);
        return;
      }

      const safePositions = (positionsData ?? []) as Position[];
      setPositions(safePositions);

      if (safePositions.length === 0) {
        setApplications([]);
        setStudentDetailById(new Map());
        setLoading(false);
        return;
      }

      const positionIds = safePositions.map((p) => p.id);
      const titleByPositionId = new Map(safePositions.map((p) => [p.id, p.title]));

      const { data: appsData, error: applicationsError } = await supabase
        .from("applications")
        .select("id, student_id, position_id, status, applied_at")
        .in("position_id", positionIds)
        .order("applied_at", { ascending: false });

      if (applicationsError) {
        console.error(
          "company applications query error:",
          JSON.stringify(applicationsError, null, 2),
          "message:",
          applicationsError.message,
          "code:",
          applicationsError.code,
          "details:",
          applicationsError.details,
          "hint:",
          applicationsError.hint
        );
        setError(applicationsError.message || "Could not load applications.");
        setLoading(false);
        return;
      }

      const baseApps = (appsData ?? []) as {
        id: string;
        student_id: string;
        position_id: string;
        status: ApplicationStatus;
        applied_at: string;
      }[];

      const studentIds = [...new Set(baseApps.map((a) => a.student_id))];

      const { data: studentsData, error: studentsError } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, user_id, university, department, major, preferences, cv_path")
            .in("id", studentIds)
        : { data: [] as Record<string, unknown>[], error: null };

      if (studentsError) {
        console.error("company applications students error:", JSON.stringify(studentsError, null, 2));
        setError(studentsError.message || "Could not load applicant profiles.");
        setLoading(false);
        return;
      }

      const studentsList = (studentsData ?? []) as {
        id: string;
        user_id: string;
        university: string | null;
        department?: string | null;
        major: string | null;
        preferences: string | null;
        cv_path: string | null;
      }[];
      const studentById = new Map(studentsList.map((s) => [s.id, s]));
      const profileUserIds = [...new Set(studentsList.map((s) => s.user_id))];

      const { data: profilesData, error: profilesError } = profileUserIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", profileUserIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };

      if (profilesError) {
        console.error("company applications profiles error:", JSON.stringify(profilesError, null, 2));
      }

      const { data: additionalRows, error: additionalError } = profileUserIds.length
        ? await supabase
            .from("student_additional_info")
            .select("user_id, gpa, technical_skills, taken_courses")
            .in("user_id", profileUserIds)
        : { data: [] as { user_id: string; gpa: number | null; technical_skills: string[] | null; taken_courses: string[] | null }[], error: null };

      if (additionalError) {
        console.error("company applications student_additional_info error:", JSON.stringify(additionalError, null, 2));
      }

      const profileById = new Map((profilesData ?? []).map((p) => [p.id, p]));
      const additionalByUserId = new Map((additionalRows ?? []).map((r) => [r.user_id, r]));

      const detailsMap = new Map<string, StudentDetail>();
      for (const s of studentsList) {
        const profile = profileById.get(s.user_id);
        const extra = additionalByUserId.get(s.user_id);
        let year = "—";
        let bio = "—";
        if (s.preferences) {
          try {
            const parsed = JSON.parse(s.preferences) as { year?: string | null; bio?: string | null };
            year = parsed?.year?.trim() ? parsed.year : "—";
            bio = parsed?.bio?.trim() ? parsed.bio : "—";
          } catch {
            bio = s.preferences;
          }
        }
        detailsMap.set(s.id, {
          userId: s.user_id,
          fullName: profile?.full_name?.trim() || "Student",
          email: profile?.email ?? "—",
          university: s.university ?? "—",
          department: (s.department as string | null | undefined)?.trim() || "—",
          major: s.major ?? "—",
          hasCv: Boolean(s.cv_path?.trim()),
          year,
          bio,
          gpa: extra?.gpa ?? null,
          technicalSkills: extra?.technical_skills ?? [],
          takenCourses: extra?.taken_courses ?? [],
        });
      }

      setApplications(
        baseApps.map((row) => ({
          id: row.id,
          student_id: row.student_id,
          position_id: row.position_id,
          internship_title: titleByPositionId.get(row.position_id)?.trim() || "—",
          status: row.status,
          applied_at: row.applied_at,
        }))
      );

      setStudentDetailById(detailsMap);
      setLoading(false);
    };

    load();
  }, []);

  const titleByPositionId = useMemo(() => {
    return new Map(positions.map((position) => [position.id, position.title]));
  }, [positions]);

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId]
  );
  const selectedStudent = selectedApplication
    ? studentDetailById.get(selectedApplication.student_id) ?? null
    : null;

  const updateApplicationStatus = async (status: ApplicationStatus) => {
    if (!selectedApplicationId) return;

    setActionLoading(true);
    setError(null);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        if (userError) {
          console.error("company applications status update user error:", userError);
        }
        setError("You must be logged in to update applications.");
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (companyError || !company) {
        if (companyError) {
          console.error("company applications status update company error:", companyError);
        }
        setError("Unable to verify your company account.");
        return;
      }

      const { data: appRow, error: appError } = await supabase
        .from("applications")
        .select("id, position_id, student_id, status")
        .eq("id", selectedApplicationId)
        .maybeSingle();
      if (appError || !appRow) {
        if (appError) {
          console.error("company applications status update app error:", appError);
        }
        setError("Application not found.");
        return;
      }

      const { data: ownedPosition, error: ownedPositionError } = await supabase
        .from("internship_positions")
        .select("id, duration_weeks, duration")
        .eq("id", appRow.position_id)
        .eq("company_id", company.id)
        .maybeSingle();
      if (ownedPositionError || !ownedPosition) {
        if (ownedPositionError) {
          console.error("company applications ownership check error:", ownedPositionError);
        }
        setError("You can only manage applications for your own internships.");
        return;
      }

      if (appRow.status === status) {
        setApplications((prev) =>
          prev.map((application) =>
            application.id === selectedApplicationId ? { ...application, status } : application
          )
        );
        return;
      }

      const effectiveNextStatus = status;
      if (!canCompanyTransitionStatus(appRow.status, effectiveNextStatus)) {
        setError("Invalid status transition for this application.");
        return;
      }

      if (effectiveNextStatus === "accepted") {
        const { data: committedApps, error: committedError } = await supabase
          .from("applications")
          .select("id")
          .eq("student_id", appRow.student_id)
          .eq("status", "accepted")
          .limit(1);
        if (committedError) {
          console.error("company applications committed check error:", committedError);
        }
        if (committedApps?.length) {
          setError("This student has already committed to another internship.");
          return;
        }
      }

      const applicationPatch = buildCompanyStatusPatch(effectiveNextStatus, null);

      const { error: updateError } = await supabase
        .from("applications")
        .update(applicationPatch)
        .eq("id", selectedApplicationId);
      if (updateError) {
        console.error("company applications status update query error:", updateError);
        setError("Failed to update application status.");
        return;
      }

      const notifyStatus: CompanyNotifyApplicationStatus | null =
        effectiveNextStatus === "accepted"
          ? "accepted"
          : effectiveNextStatus === "rejected"
            ? "rejected"
            : effectiveNextStatus === "completed"
              ? "completed"
              : null;

      if (notifyStatus) {
        const cachedStudent = studentDetailById.get(appRow.student_id);
        let targetUserId = cachedStudent?.userId ?? null;

        if (!targetUserId) {
          const { data: studentRow, error: studentLookupError } = await supabase
            .from("students")
            .select("user_id")
            .eq("id", appRow.student_id)
            .maybeSingle();
          if (studentLookupError) {
            console.error("company applications notification student lookup error:", studentLookupError);
          }
          targetUserId = studentRow?.user_id ?? null;
        }

        if (targetUserId && selectedApplicationId) {
          const content = buildCompanyApplicationStatusNotification(
            notifyStatus,
            companyName,
            locale,
            selectedApplicationId
          );

          const notificationPayload = {
            recipientUserId: targetUserId,
            ...content,
          };

          if (isValidCompanyDispatchPayload(notificationPayload)) {
            const notifyResult = await dispatchNotification(notificationPayload);

            if (!notifyResult.ok) {
              console.error("company applications notification error:", notifyResult.error);
              setError(t("companyApplications.notifyFailed"));
            }
          } else {
            console.error("company applications invalid notification payload:", notificationPayload);
            setError(t("companyApplications.notifyFailed"));
          }
        }
      }

      const storedStatus =
        effectiveNextStatus === "accepted" ? COMMITMENT_PENDING_STATUS : effectiveNextStatus;

      setApplications((prev) =>
        prev.map((application) =>
          application.id === selectedApplicationId
            ? { ...application, status: storedStatus as ApplicationStatus }
            : application
        )
      );
      notifyCompanyDashboardUpdated();
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApplicantCv = async (applicationId: string) => {
    setCvOpeningId(applicationId);
    setError(null);
    try {
      await openCompanyApplicantCv(applicationId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open CV.");
    } finally {
      setCvOpeningId(null);
    }
  };

  const visibleApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (positionFilter && a.position_id !== positionFilter) return false;

      const student = studentDetailById.get(a.student_id);
      const hasCv = Boolean(student?.hasCv);
      if (hasCvFilter === "yes" && !hasCv) return false;
      if (hasCvFilter === "no" && hasCv) return false;

      if (!q) return true;
      const title = a.internship_title?.toLowerCase() ?? "";
      const fullName = student?.fullName?.toLowerCase() ?? "";
      const email = student?.email?.toLowerCase() ?? "";
      const university = student?.university?.toLowerCase() ?? "";
      const department = student?.department?.toLowerCase() ?? "";
      return (
        title.includes(q) ||
        fullName.includes(q) ||
        email.includes(q) ||
        university.includes(q) ||
        department.includes(q)
      );
    });
  }, [applications, studentDetailById, search, statusFilter, positionFilter, hasCvFilter]);

  const stats = useMemo(() => {
    const pending = applications.filter((a) => a.status === "pending").length;
    const awaitingCommit = applications.filter((a) => a.status === COMMITMENT_PENDING_STATUS).length;
    const accepted = applications.filter((a) => a.status === "accepted").length;
    const completed = applications.filter((a) => a.status === "completed").length;
    const withCv = applications.filter((a) => studentDetailById.get(a.student_id)?.hasCv).length;
    return { total: applications.length, pending, awaitingCommit, accepted, completed, withCv };
  }, [applications, studentDetailById]);

  const statusFilterOptions: { value: "" | ApplicationStatus; label: string; count: number }[] = [
    { value: "", label: "All", count: stats.total },
    { value: "pending", label: "Pending", count: stats.pending },
    {
      value: COMMITMENT_PENDING_STATUS,
      label: "Awaiting student confirmation",
      count: stats.awaitingCommit,
    },
    { value: "accepted", label: "Accepted", count: stats.accepted },
    { value: "rejected", label: "Rejected", count: applications.filter((a) => a.status === "rejected").length },
    { value: "completed", label: "Completed", count: stats.completed },
  ];

  const hasActiveFilters =
    search.trim().length > 0 || Boolean(statusFilter) || Boolean(positionFilter) || Boolean(hasCvFilter);

  const statusVariant = (status: ApplicationStatus) => {
    if (status === "accepted") return "success";
    if (status === COMMITMENT_PENDING_STATUS) return "warning";
    if (status === "rejected" || status === "commitment_expired") return "danger";
    if (status === "completed") return "info";
    if (status === "withdrawn") return "default";
    return "warning";
  };

  return (
    <main className="pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-lg dark:border-indigo-500/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative px-5 py-5 sm:px-6 sm:py-7">
            <div className="max-w-xl">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Applications</h1>
              <p className="mt-2 text-sm text-indigo-100/90 sm:text-base">
                Review student applications, open CVs, and accept or reject candidates.
              </p>
            </div>
          </div>
        </section>

        {!loading ? (
          <div className="mt-6">
            <DashboardStatGrid>
              <DashboardStatCard
                label="Total applications"
                value={stats.total}
                cardClass="bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300"
                delayMs={0}
              />
              <DashboardStatCard
                label="Pending"
                value={stats.pending}
                cardClass="bg-yellow-100 text-yellow-900 dark:bg-yellow-500/10 dark:text-yellow-300"
                delayMs={80}
              />
              <DashboardStatCard
                label="Active"
                value={stats.accepted}
                cardClass="bg-green-100 text-green-900 dark:bg-green-500/10 dark:text-green-300"
                delayMs={160}
              />
              <DashboardStatCard
                label="Completed"
                value={stats.completed}
                cardClass="bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-300"
                delayMs={240}
              />
            </DashboardStatGrid>
          </div>
        ) : (
          <StatCardsSkeleton />
        )}

        {loading ? (
          <CardGridSkeleton count={4} variant="internship" columns="sm:grid-cols-2" className="mt-6" />
        ) : error && applications.length === 0 ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : applications.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="No applications yet"
              description="Applications will appear here once students apply to your internship posts."
            />
          </div>
        ) : (
          <>
            {error ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
                {error}
              </p>
            ) : null}

            <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <Input
                label="Search"
                placeholder="Student, internship, university…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {statusFilterOptions.map((opt) => {
                  const isActive = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {opt.label}
                      <span className="ms-1.5 tabular-nums opacity-80">({opt.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Select
                  label="Internship"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  options={[
                    { value: "", label: "All internships" },
                    ...positions.map((p) => ({ value: p.id, label: p.title })),
                  ]}
                />
                <Select
                  label="CV"
                  value={hasCvFilter}
                  onChange={(e) => setHasCvFilter((e.target.value as "" | "yes" | "no") || "")}
                  options={[
                    { value: "", label: "All applicants" },
                    { value: "yes", label: "Has CV" },
                    { value: "no", label: "No CV" },
                  ]}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-400">
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{visibleApplications.length}</span> of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">{applications.length}</span>
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                      setPositionFilter("");
                      setHasCvFilter("");
                    }}
                    className="font-medium text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </section>

            {visibleApplications.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No matching applications"
                  description="Try clearing filters or changing your search query."
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {visibleApplications.map((application) => {
                  const student = studentDetailById.get(application.student_id);
                  return (
                    <article
                      key={application.id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
                    >
                      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                              {student?.fullName ?? "Student"}
                            </h2>
                            <p className="mt-1 truncate text-sm text-indigo-700/90 dark:text-indigo-300/90">
                              {application.internship_title}
                            </p>
                          </div>
                          <Badge variant={statusVariant(application.status)}>{statusLabel(application.status)}</Badge>
                        </div>

                        <dl className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                            <dt className="text-slate-500 dark:text-slate-400">University</dt>
                            <dd className="truncate font-medium text-slate-900 dark:text-white">{student?.university ?? "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                            <dt className="text-slate-500 dark:text-slate-400">Department</dt>
                            <dd className="truncate font-medium text-slate-900 dark:text-white">{student?.department ?? "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                            <dt className="text-slate-500 dark:text-slate-400">Applied</dt>
                            <dd className="font-medium text-slate-900 dark:text-white">{formatAppliedDate(application.applied_at)}</dd>
                          </div>
                        </dl>

                        <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                          <Button
                            variant="primary"
                            className="flex-1 sm:flex-none"
                            onClick={() => {
                              setSelectedApplicationId(application.id);
                              setDetailOpen(true);
                            }}
                          >
                            View details
                          </Button>
                          {student?.hasCv ? (
                            <Button
                              variant="secondary"
                              className="rounded-xl"
                              disabled={cvOpeningId === application.id}
                              onClick={() => void handleOpenApplicantCv(application.id)}
                            >
                              {cvOpeningId === application.id ? "Opening…" : "Open CV"}
                            </Button>
                          ) : (
                            <span className="inline-flex items-center rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                              No CV
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Application details"
        footer={
          <>
            {selectedStudent?.userId ? (
              <MessageStudentButton
                studentUserId={selectedStudent.userId}
                studentName={selectedStudent.fullName}
                onMessage={() => setDetailOpen(false)}
              />
            ) : null}
            <Button variant="secondary" onClick={() => setDetailOpen(false)} disabled={actionLoading}>
              Close
            </Button>
            {selectedApplication?.status === "pending" && (
              <>
                <Button
                  variant="danger"
                  onClick={() => updateApplicationStatus("rejected")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Reject"}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => updateApplicationStatus("accepted")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Accept"}
                </Button>
              </>
            )}
            {selectedApplication?.status === COMMITMENT_PENDING_STATUS && (
              <Button
                variant="danger"
                onClick={() => updateApplicationStatus("rejected")}
                disabled={actionLoading}
              >
                {actionLoading ? "Updating..." : "Withdraw offer"}
              </Button>
            )}
            {selectedApplication?.status === "accepted" && (
              <Button
                variant="secondary"
                onClick={() => updateApplicationStatus("completed")}
                disabled={actionLoading}
              >
                {actionLoading ? "Updating..." : "Mark as completed"}
              </Button>
            )}
          </>
        }
      >
        {!selectedApplication ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No application selected.</p>
        ) : (
          <div className="space-y-2 text-sm text-gray-700 transition-colors duration-300 dark:text-slate-300">
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Student:</span> {selectedStudent?.fullName ?? "Student"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Email:</span> {selectedStudent?.email ?? "—"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">University:</span> {selectedStudent?.university ?? "—"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Department:</span> {selectedStudent?.department ?? "—"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Major:</span> {selectedStudent?.major ?? "—"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Year:</span> {selectedStudent?.year ?? "—"}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Bio:</span> {selectedStudent?.bio ?? "—"}</p>
            <div className="mt-2 rounded-md bg-gray-50 p-3 transition-colors duration-300 dark:bg-slate-800">
              <p>
                <span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Academic Info:</span>{" "}
                GPA: {selectedStudent?.gpa != null ? selectedStudent.gpa : "Not provided"}
              </p>
              <div className="mt-2">
                <p className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Skills:</p>
                {selectedStudent && selectedStudent.technicalSkills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedStudent.technicalSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1">No data</p>
                )}
              </div>
              <div className="mt-2">
                <p className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Taken Courses:</p>
                {selectedStudent && selectedStudent.takenCourses.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {selectedStudent.takenCourses.map((course) => (
                      <li key={course}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">No data</p>
                )}
              </div>
            </div>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">CV:</span>{" "}
              {selectedStudent?.hasCv && selectedApplication ? (
                <Button
                  variant="secondary"
                  disabled={cvOpeningId === selectedApplication.id}
                  onClick={() => void handleOpenApplicantCv(selectedApplication.id)}
                >
                  {cvOpeningId === selectedApplication.id ? "Opening..." : "Open CV"}
                </Button>
              ) : (
                <span className="text-gray-500 transition-colors duration-300 dark:text-slate-400">No CV uploaded</span>
              )}
            </p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Internship:</span> {selectedApplication.internship_title}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Applied:</span> {new Date(selectedApplication.applied_at).toLocaleDateString()}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Status:</span> <span className="capitalize">{selectedApplication.status}</span></p>
            {(selectedApplication.status === "rejected" || selectedApplication.status === "completed") && (
              <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-600 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-400">
                This application is already finalized and cannot be changed.
              </p>
            )}
            {companyId === null && (
              <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">
                Unable to verify company ownership.
              </p>
            )}
          </div>
        )}
      </Modal>
    </Container>
    </main>
  );
}
