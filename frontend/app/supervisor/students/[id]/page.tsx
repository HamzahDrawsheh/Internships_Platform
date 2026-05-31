"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { DetailPageSkeleton } from "@/components/loading";
import ApplicationStatusBadge from "@/components/applications/ApplicationStatusBadge";
import { EmptyState } from "@/components/ui";
import { normalizeApplicationStatus } from "@/lib/applications/commitment";
import { StudentProfileAvatar } from "@/components/profile/StudentProfileAvatar";
import { ColoredChips, ProfileField, ProfileSectionCard } from "@/components/profile/StudentProfileUi";
import { normalizeProfileGender, type ProfileGender } from "@/lib/profile/gender";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import {
  deriveStudentPlacementStatus,
  placementStatusTextClass,
  type StudentPlacementStatus,
} from "@/lib/supervisor/student-placement-status";

function placementStatusLabel(status: StudentPlacementStatus, t: (key: string) => string): string {
  const keys: Record<StudentPlacementStatus, string> = {
    Active: "supervisor.students.active",
    Pending: "supervisor.students.pending",
    Completed: "supervisor.students.completed",
    Available: "supervisor.students.available",
  };
  return t(keys[status]);
}

function appStatusLabel(status: string, t: (key: string) => string): string {
  const k = status.trim().toLowerCase();
  if (!k || k === "unknown") return t("supervisor.studentDetail.statusUnknown");
  const key = `supervisor.reports.${k}` as const;
  const translated = t(key);
  return translated === key ? status : translated;
}

function departmentsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

function hasApplicationMessage(message: string) {
  const t = message.trim();
  return t.length > 0 && t !== "—";
}

function formatApplicationDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function StudentDetailsPage() {
  const params = useParams();
  const { t } = useI18n();
  const id = typeof params.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [applicationsQueryError, setApplicationsQueryError] = useState<string | null>(null);
  const [gender, setGender] = useState<ProfileGender>("");
  const [studentInfo, setStudentInfo] = useState<{
    student_id: string;
    full_name: string;
    email: string;
    university: string;
    department: string;
    major: string;
    year: string;
    bio: string;
    gpa: number | null;
    technical_skills: string[];
    taken_courses: string[];
    hasAdditionalInfoRow: boolean;
  } | null>(null);
  const [applications, setApplications] = useState<
    {
      id: string;
      applied_at: string;
      status: string;
      internship_title: string;
      company_name: string;
      message: string;
    }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    const loadDetails = async () => {
      setLoading(true);
      setErrorKey(null);
      setApplicationsQueryError(null);

      if (!id) {
        setErrorKey("invalidId");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor student details getUser error:", userError);
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
      if (supervisorError) {
        console.error("supervisor student details supervisor query error:", supervisorError);
        setErrorKey("loadProfileError");
        setLoading(false);
        return;
      }
      if (!supervisor?.department) {
        setErrorKey("supervisorNotFound");
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major, skills, preferences")
        .eq("id", id)
        .maybeSingle();

      if (studentError) {
        console.error("student error:", studentError);
        setErrorKey("loadStudentError");
        setLoading(false);
        return;
      }
      if (!student || !departmentsMatch(student.department, supervisor.department)) {
        setErrorKey("accessDenied");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } =
        student.user_id == null || student.user_id === ""
          ? { data: null, error: null }
          : await supabase
              .from("profiles")
              .select("id, full_name, email, gender")
              .eq("id", student.user_id)
              .maybeSingle();

      if (profileError) {
        console.error("profile error:", profileError);
      }
      setGender(normalizeProfileGender(profile?.gender));

      const { data: additionalRow, error: additionalInfoError } = await supabase
        .from("student_additional_info")
        .select("gpa, technical_skills, taken_courses")
        .eq("user_id", student.user_id)
        .maybeSingle();

      if (additionalInfoError) {
        console.error("additional info error:", additionalInfoError);
      }

      let year = "—";
      let bio = "—";
      if (student.preferences) {
        try {
          const parsed = JSON.parse(student.preferences) as { year?: string | null; bio?: string | null };
          year = parsed?.year?.trim() ? parsed.year : "—";
          bio = parsed?.bio?.trim() ? parsed.bio : "—";
        } catch {
          bio = student.preferences;
        }
      }

      const hasAdditionalInfoRow = Boolean(additionalRow) && additionalInfoError == null;
      const gpa = additionalRow?.gpa ?? null;
      const technical_skills = Array.isArray(additionalRow?.technical_skills) ? additionalRow!.technical_skills : [];
      const taken_courses = Array.isArray(additionalRow?.taken_courses) ? additionalRow!.taken_courses : [];

      setStudentInfo({
        student_id: student.id,
        full_name: profile?.full_name ?? "—",
        email: profile?.email ?? "—",
        university: student.university ?? "—",
        department: student.department ?? "—",
        major: student.major ?? "—",
        year,
        bio,
        gpa,
        technical_skills,
        taken_courses,
        hasAdditionalInfoRow,
      });

      const { data: applicationsData, error: applicationsError } = await supabase
        .from("v_application_student_details")
        .select("application_id, internship_title, application_status, applied_at")
        .eq("student_id", id)
        .order("applied_at", { ascending: false });

      if (applicationsError) {
        console.error("v_application_student_details error:", applicationsError);
        setApplicationsQueryError("loadAppsError");
        setApplications([]);
      } else {
        const finalApplications = departmentsMatch(student.department, supervisor.department)
          ? (applicationsData ?? [])
          : [];

        const applicationIds = finalApplications.map((a) => a.application_id);

        type PosRow = {
          title: string | null;
          companies: { company_name: string | null } | { company_name: string | null }[] | null;
        } | null;

        const { data: extras, error: extrasError } =
          applicationIds.length > 0
            ? await supabase
                .from("applications")
                .select(
                  `
                id,
                message,
                internship_positions (
                  title,
                  companies (
                    company_name
                  )
                )
              `,
                )
                .in("id", applicationIds)
            : { data: [] as { id: string; message: string | null; internship_positions: PosRow | PosRow[] }[], error: null };

        if (extrasError) {
          console.error("applications extras error:", extrasError);
          setApplicationsQueryError("loadAppsExtrasError");
          setApplications([]);
        } else {
          setApplicationsQueryError(null);
          const detailById = new Map(
            (extras ?? []).map((r) => {
              const ar = r as {
                id: string;
                message: string | null;
                internship_positions: PosRow | PosRow[];
              };
              return [ar.id, ar] as const;
            }),
          );

          setApplications(
            finalApplications.map((v) => {
              const d = detailById.get(v.application_id);
              const posRaw = d?.internship_positions;
              const pos = Array.isArray(posRaw) ? posRaw[0] : posRaw;
              const compRaw = pos?.companies;
              const comp = Array.isArray(compRaw) ? compRaw[0] : compRaw;
              const titleFromView = v.internship_title?.trim();
              const titleFromPos = pos?.title?.trim();
              const companyName = comp?.company_name?.trim();
              const msg = d?.message?.trim();
              return {
                id: v.application_id,
                applied_at: v.applied_at,
                status: v.application_status?.trim() ? v.application_status : "Unknown",
                internship_title: titleFromView || titleFromPos || "Unknown internship",
                company_name: companyName || "Unknown company",
                message: msg && msg.length > 0 ? msg : "—",
              };
            }),
          );
        }
      }

      setLoading(false);
    };

    loadDetails();
  }, [id]);

  const placementStatus = useMemo(
    () => deriveStudentPlacementStatus(applications.map((a) => ({ status: a.status.toLowerCase() }))),
    [applications],
  );

  const heroSubtitle = studentInfo
    ? [studentInfo.university !== "—" ? studentInfo.university : "", studentInfo.major !== "—" ? studentInfo.major : ""]
        .filter(Boolean)
        .join(" · ")
    : "";

  const courseCount = studentInfo?.taken_courses.length ?? 0;
  const skillCount = studentInfo?.technical_skills.length ?? 0;

  return (
    <main className="pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-3xl">
        {loading ? (
          <DetailPageSkeleton />
        ) : errorKey ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {t(`supervisor.studentDetail.${errorKey}`)}
          </p>
        ) : studentInfo ? (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-violet-200/50 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 shadow-lg shadow-violet-200/40 dark:border-violet-500/20 dark:shadow-violet-900/30">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-fuchsia-400/20 blur-3xl" />
              <div className="relative p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <StudentProfileAvatar gender={gender} name={studentInfo.full_name} />
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
                        {studentInfo.full_name !== "—" ? studentInfo.full_name : t("supervisor.studentDetail.studentFallback")}
                      </h1>
                      {studentInfo.email !== "—" ? (
                        <p className="mt-1 truncate text-sm text-violet-100/90">{studentInfo.email}</p>
                      ) : null}
                      {heroSubtitle ? <p className="mt-1 text-sm text-violet-100/80">{heroSubtitle}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {studentInfo.department !== "—" ? (
                          <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            {studentInfo.department}
                          </span>
                        ) : null}
                        <span className="inline-flex rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                          {placementStatusLabel(placementStatus, t)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href="/supervisor/students" className="shrink-0">
                    <span className="inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20">
                      {t("supervisor.studentDetail.backToList")}
                    </span>
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <p className="text-lg font-bold tabular-nums text-white">
                      {studentInfo.gpa != null ? studentInfo.gpa.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs font-medium text-violet-100/80">{t("supervisor.studentDetail.gpa")}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <p className="text-lg font-bold tabular-nums text-white">{courseCount > 0 ? courseCount : "—"}</p>
                    <p className="text-xs font-medium text-violet-100/80">{t("supervisor.studentDetail.courses")}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <p className="text-lg font-bold tabular-nums text-white">{applications.length}</p>
                    <p className="text-xs font-medium text-violet-100/80">{t("supervisor.studentDetail.applicationsStat")}</p>
                  </div>
                  <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                    <p className="text-lg font-bold tabular-nums text-white">{skillCount > 0 ? skillCount : "—"}</p>
                    <p className="text-xs font-medium text-violet-100/80">{t("supervisor.studentDetail.skillsLabel")}</p>
                  </div>
                </div>
              </div>
            </section>

            <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
              {t("supervisor.studentDetail.monitoringDesc")}
            </p>

            <div className="mt-6 space-y-5">
              <ProfileSectionCard
                title={t("supervisor.studentDetail.personalInfo")}
                accent="violet"
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProfileField label={t("supervisor.studentDetail.fullName")} value={studentInfo.full_name} />
                  <ProfileField label={t("supervisor.studentDetail.email")} value={studentInfo.email} />
                  <ProfileField label={t("supervisor.studentDetail.university")} value={studentInfo.university} />
                  <ProfileField label={t("supervisor.studentDetail.department")} value={studentInfo.department} />
                  <ProfileField label={t("supervisor.studentDetail.major")} value={studentInfo.major} />
                  <ProfileField label={t("supervisor.studentDetail.year")} value={studentInfo.year} />
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                title={t("supervisor.studentDetail.bioSkills")}
                accent="cyan"
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M11.3 1.046a1 1 0 011.414 0l1.544 1.544a1 1 0 01.293.707V5.5a1 1 0 001 1h2.203a1 1 0 01.707.293l1.544 1.544a1 1 0 010 1.414l-1.544 1.544a1 1 0 01-.707.293H15.5a1 1 0 00-1 1v2.203a1 1 0 01-.293.707l-1.544 1.544a1 1 0 01-1.414 0l-1.544-1.544a1 1 0 01-.293-.707V15.5a1 1 0 00-1-1h-2.203a1 1 0 01-.707-.293l-1.544-1.544a1 1 0 010-1.414l1.544-1.544a1 1 0 01.707-.293H5.5a1 1 0 001-1V8.544a1 1 0 01.293-.707l1.544-1.544zM10 13a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                <div className="space-y-3">
                  <ProfileField label={t("supervisor.studentDetail.bio")} value={studentInfo.bio} />
                  <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t("supervisor.studentDetail.technicalSkills")}
                    </p>
                    <div className="mt-2">
                      <ColoredChips items={studentInfo.technical_skills} />
                    </div>
                  </div>
                </div>
              </ProfileSectionCard>

              <ProfileSectionCard
                title={t("supervisor.studentDetail.academicRecord")}
                accent="emerald"
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path
                      fillRule="evenodd"
                      d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                {!studentInfo.hasAdditionalInfoRow ? (
                  <p className="rounded-xl bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
                    {t("supervisor.studentDetail.noAcademicInfo")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <ProfileField
                      label={t("supervisor.studentDetail.gpa")}
                      value={studentInfo.gpa != null ? String(studentInfo.gpa) : undefined}
                    />
                    <div className="rounded-xl bg-slate-50/80 px-4 py-3 dark:bg-slate-800/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {t("supervisor.studentDetail.takenCourses")}
                      </p>
                      <div className="mt-2">
                        <ColoredChips items={studentInfo.taken_courses} />
                      </div>
                    </div>
                  </div>
                )}
              </ProfileSectionCard>

              <ProfileSectionCard
                title={t("supervisor.studentDetail.applicationsHistory")}
                accent="fuchsia"
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 00-1 1v6a1 1 0 102 0v-6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                }
              >
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`text-sm ${placementStatusTextClass(placementStatus)}`}>
                    {placementStatusLabel(placementStatus, t)}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {fmt(t("supervisor.studentDetail.applicationsTotal"), { count: applications.length })}
                  </span>
                </div>

                {applicationsQueryError ? (
                  <p
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                    role="alert"
                  >
                    {t(`supervisor.studentDetail.${applicationsQueryError}`)}
                  </p>
                ) : applications.length === 0 ? (
                  <EmptyState
                    title={t("supervisor.studentDetail.noApplicationsTitle")}
                    description={t("supervisor.studentDetail.noApplicationsDesc")}
                  />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {applications.map((application, index) => {
                      const showMessage = hasApplicationMessage(application.message);
                      const isLatest = index === 0;
                      return (
                        <article
                          key={application.id}
                          className={`overflow-hidden rounded-xl border bg-white shadow-sm transition dark:bg-slate-900 ${
                            isLatest
                              ? "border-violet-300 ring-1 ring-violet-200/60 dark:border-violet-500/40 dark:ring-violet-500/20"
                              : "border-slate-200/80 dark:border-slate-800"
                          }`}
                        >
                          <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                {isLatest ? (
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-300">
                                    {t("supervisor.studentDetail.latest")}
                                  </p>
                                ) : null}
                                <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {application.company_name}
                                </h3>
                                <p className="mt-0.5 truncate text-sm text-violet-700/90 dark:text-violet-300/90">
                                  {application.internship_title}
                                </p>
                              </div>
                              <ApplicationStatusBadge
                                status={normalizeApplicationStatus(application.status)}
                                label={appStatusLabel(application.status, t)}
                              />
                            </div>

                            <dl className="mt-3 space-y-2 text-sm">
                              <div className="flex justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                                <dt className="text-slate-500 dark:text-slate-400">{t("supervisor.studentDetail.applied")}</dt>
                                <dd className="font-medium text-slate-900 dark:text-white">
                                  {formatApplicationDate(application.applied_at)}
                                </dd>
                              </div>
                            </dl>

                            <div className="mt-3 rounded-lg bg-slate-50/80 px-3 py-2 text-sm dark:bg-slate-800/40">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {t("supervisor.studentDetail.message")}
                              </p>
                              {showMessage ? (
                                <p className="mt-1 line-clamp-3 text-slate-700 dark:text-slate-300">{application.message}</p>
                              ) : (
                                <p className="mt-1 italic text-slate-400 dark:text-slate-500">
                                  {t("supervisor.studentDetail.noMessage")}
                                </p>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </ProfileSectionCard>
            </div>
          </>
        ) : null}
      </Container>
    </main>
  );
}
