"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { CardGridSkeleton } from "@/components/loading";
import { Badge, EmptyState, Input } from "@/components/ui";
import { StudentProfileAvatar } from "@/components/profile/StudentProfileAvatar";
import { normalizeProfileGender, type ProfileGender } from "@/lib/profile/gender";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import {
  deriveStudentPlacementStatus,
  placementStatusBadgeVariant,
  type StudentPlacementStatus,
} from "@/lib/supervisor/student-placement-status";

type StudentRow = {
  id: string;
  full_name: string;
  email: string;
  university: string;
  department: string;
  major: string;
  year: string;
  status: StudentPlacementStatus;
  gender: ProfileGender;
};

type StatusFilter = "" | StudentPlacementStatus;

function placementStatusLabel(status: StudentPlacementStatus, t: (key: string) => string): string {
  const keys: Record<StudentPlacementStatus, string> = {
    Active: "supervisor.students.active",
    Pending: "supervisor.students.pending",
    Completed: "supervisor.students.completed",
    Available: "supervisor.students.available",
  };
  return t(keys[status]);
}

export default function StudentsListPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  useEffect(() => {
    const supabase = createClient();

    const loadStudents = async () => {
      setLoading(true);
      setErrorKey(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("supervisor students getUser error:", userError);
        setErrorKey("loadAccountError");
        setLoading(false);
        return;
      }
      if (!user) {
        setErrorKey("loginRequired");
        setLoading(false);
        return;
      }

      const { data: supervisor, error: supervisorError } = await supabase
        .from("supervisors")
        .select("id, department")
        .eq("user_id", user.id)
        .maybeSingle();

      if (supervisorError && supervisorError.code !== "PGRST116") {
        console.error("supervisor students supervisor query error:", supervisorError);
        setErrorKey("loadProfileError");
        setLoading(false);
        return;
      }

      if (!supervisor?.department) {
        setErrorKey("deptMissing");
        setLoading(false);
        return;
      }

      setDepartmentName(supervisor.department);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major, preferences")
        .eq("department", supervisor.department);

      if (studentsError) {
        console.error("supervisor students list query error:", studentsError);
        setErrorKey("loadStudentsError");
        setLoading(false);
        return;
      }

      const safeStudents =
        (studentsData as {
          id: string;
          user_id: string;
          university: string | null;
          department: string | null;
          major: string | null;
          preferences: string | null;
        }[]) ?? [];
      if (safeStudents.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(safeStudents.map((student) => student.user_id))];
      const { data: profilesData, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email, gender").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null; gender: string | null }[], error: null };

      if (profilesError) {
        console.error("supervisor students profiles query error:", profilesError);
      }

      const profileByUserId = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));

      const studentIds = safeStudents.map((student) => student.id);
      const { data: applicationsData, error: applicationsError } = studentIds.length
        ? await supabase
            .from("applications")
            .select("student_id, status")
            .in("student_id", studentIds)
        : { data: [] as { student_id: string; status: "pending" | "accepted" | "rejected" | "completed" }[], error: null };

      if (applicationsError) {
        console.error("supervisor students applications query error:", applicationsError);
      }

      const applicationsByStudentId = new Map<string, { status: string }[]>();
      (applicationsData ?? []).forEach((application) => {
        const list = applicationsByStudentId.get(application.student_id) ?? [];
        list.push(application);
        applicationsByStudentId.set(application.student_id, list);
      });

      const mappedRows: StudentRow[] = safeStudents.map((student) => {
        const profile = profileByUserId.get(student.user_id);
        let year = "—";
        if (student.preferences) {
          try {
            const parsed = JSON.parse(student.preferences) as { year?: string | null };
            year = parsed?.year?.trim() ? parsed.year : "—";
          } catch {
            year = "—";
          }
        }

        return {
          id: student.id,
          full_name: profile?.full_name?.trim() || "—",
          email: profile?.email ?? "—",
          university: student.university ?? "—",
          department: student.department ?? "—",
          major: student.major ?? "—",
          year,
          status: deriveStudentPlacementStatus(applicationsByStudentId.get(student.id) ?? []),
          gender: normalizeProfileGender(profile?.gender),
        };
      });

      setRows(mappedRows);
      setLoading(false);
    };

    loadStudents();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "Active").length;
    const pending = rows.filter((r) => r.status === "Pending").length;
    const completed = rows.filter((r) => r.status === "Completed").length;
    const available = rows.filter((r) => r.status === "Available").length;
    return { total: rows.length, active, pending, completed, available };
  }, [rows]);

  const statusFilterOptions: { value: StatusFilter; label: string; count: number }[] = [
    { value: "", label: t("supervisor.students.all"), count: stats.total },
    { value: "Active", label: t("supervisor.students.active"), count: stats.active },
    { value: "Pending", label: t("supervisor.students.pending"), count: stats.pending },
    { value: "Completed", label: t("supervisor.students.completed"), count: stats.completed },
    { value: "Available", label: t("supervisor.students.available"), count: stats.available },
  ];

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((student) => {
      if (statusFilter && student.status !== statusFilter) return false;
      if (!q) return true;
      return (
        student.full_name.toLowerCase().includes(q) ||
        student.email.toLowerCase().includes(q) ||
        student.university.toLowerCase().includes(q) ||
        student.major.toLowerCase().includes(q) ||
        student.department.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const hasActiveFilters = search.trim().length > 0 || Boolean(statusFilter);

  return (
    <main className="pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-lg dark:border-indigo-500/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{t("supervisor.students.title")}</h1>
            <p className="mt-2 max-w-xl text-sm text-indigo-100/90">
              {departmentName
                ? fmt(t("supervisor.students.heroDesc"), { department: departmentName })
                : t("supervisor.students.heroDescGeneric")}
            </p>
            {!loading && rows.length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-xl font-bold tabular-nums text-white">{stats.total}</p>
                  <p className="text-xs font-medium text-indigo-100/80">{t("supervisor.students.total")}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-xl font-bold tabular-nums text-white">{stats.active}</p>
                  <p className="text-xs font-medium text-indigo-100/80">{t("supervisor.students.active")}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-xl font-bold tabular-nums text-white">{stats.pending}</p>
                  <p className="text-xs font-medium text-indigo-100/80">{t("supervisor.students.pending")}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-xl font-bold tabular-nums text-white">{stats.completed}</p>
                  <p className="text-xs font-medium text-indigo-100/80">{t("supervisor.students.completed")}</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                  <p className="text-xl font-bold tabular-nums text-white">{stats.available}</p>
                  <p className="text-xs font-medium text-indigo-100/80">{t("supervisor.students.available")}</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {loading ? (
          <CardGridSkeleton count={4} variant="internship" columns="sm:grid-cols-2" className="mt-6" />
        ) : errorKey && rows.length === 0 ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {t(`supervisor.students.${errorKey}`)}
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={t("supervisor.students.noStudentsTitle")}
              description={t("supervisor.students.noStudentsDesc")}
            />
          </div>
        ) : (
          <>
            {errorKey ? (
              <p
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                role="alert"
              >
                {t(`supervisor.students.${errorKey}`)}
              </p>
            ) : null}

            <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <Input
                label={t("supervisor.students.searchLabel")}
                placeholder={t("supervisor.students.searchPlaceholder")}
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
                          ? "bg-[#7C3AED] text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {opt.label}
                      <span className="ms-1.5 tabular-nums opacity-80">({opt.count})</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                <p className="text-slate-600 dark:text-slate-400">
                  {fmt(t("supervisor.students.showing"), { visible: visibleRows.length, total: rows.length })}
                </p>
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                    }}
                    className="font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    {t("supervisor.students.clearFilters")}
                  </button>
                ) : null}
              </div>
            </section>

            {visibleRows.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title={t("supervisor.students.noMatchTitle")}
                  description={t("supervisor.students.noMatchDesc")}
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {visibleRows.map((student) => (
                  <article
                    key={student.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-violet-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-500/30"
                  >
                    <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-start gap-3">
                        <StudentProfileAvatar
                          gender={student.gender}
                          name={student.full_name}
                          className="h-14 w-14 rounded-xl border-2 border-violet-100 dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                                {student.full_name}
                              </h2>
                              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                            </div>
                            <Badge variant={placementStatusBadgeVariant(student.status)}>
                              {placementStatusLabel(student.status, t)}
                            </Badge>
                          </div>
                          {student.major !== "—" ? (
                            <p className="mt-2 truncate text-sm font-medium text-violet-700/90 dark:text-violet-300/90">
                              {student.major}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <dl className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <dt className="text-slate-500 dark:text-slate-400">{t("supervisor.students.colUniversity")}</dt>
                          <dd className="truncate font-medium text-slate-900 dark:text-white">{student.university}</dd>
                        </div>
                        <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <dt className="text-slate-500 dark:text-slate-400">{t("supervisor.students.colDepartment")}</dt>
                          <dd className="truncate font-medium text-slate-900 dark:text-white">{student.department}</dd>
                        </div>
                        <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                          <dt className="text-slate-500 dark:text-slate-400">{t("supervisor.students.colYear")}</dt>
                          <dd className="font-medium text-slate-900 dark:text-white">{student.year}</dd>
                        </div>
                      </dl>

                      <div className="mt-auto border-t border-slate-100 pt-4 dark:border-slate-800">
                        <Link
                          href={`/supervisor/students/${student.id}`}
                          className="inline-flex w-full items-center justify-center rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white shadow-md transition hover:bg-[#6D28D9] sm:w-auto"
                        >
                          {t("supervisor.students.viewProfile")}
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
