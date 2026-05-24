"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailPageSkeleton } from "@/components/loading";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

function departmentsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

function hasApplicationMessage(message: string) {
  const t = message.trim();
  return t.length > 0 && t !== "—";
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const k = status.trim().toLowerCase();
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  if (k === "accepted") {
    return (
      <span
        className={`${base} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        {status}
      </span>
    );
  }
  if (k === "rejected") {
    return (
      <span
        className={`${base} border-red-200 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200`}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        {status}
      </span>
    );
  }
  return (
    <span
      className={`${base} border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      {status}
    </span>
  );
}

export default function StudentDetailsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationsQueryError, setApplicationsQueryError] = useState<string | null>(null);
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

  const formatApplicationDate = (value: string | null | undefined) => {
    if (value == null || String(value).trim() === "") return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(parsed);
  };

  useEffect(() => {
    const supabase = createClient();

    const loadDetails = async () => {
      setLoading(true);
      setError(null);
      setApplicationsQueryError(null);

      if (!id) {
        setError("Invalid student id.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor student details getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access this page.");
        setLoading(false);
        return;
      }

      const { data: supervisor, error: supervisorError } = await supabase
        .from("supervisors")
        .select("id, department")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor student details supervisor query error:", JSON.stringify(supervisorError, null, 2));
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }
      if (!supervisor?.department) {
        setError("Supervisor profile not found.");
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major, skills, preferences")
        .eq("id", id)
        .maybeSingle();

      if (studentError) {
        console.error("student error:", JSON.stringify(studentError, null, 2));
        setError("Unable to load student details.");
        setLoading(false);
        return;
      }
      if (!student || !departmentsMatch(student.department, supervisor.department)) {
        setError("Access denied or student not found.");
        setLoading(false);
        return;
      }

      console.log("student.id:", student?.id);
      console.log("student.user_id:", student?.user_id);

      // If profile is null with profile error "no error", run in Supabase SQL Editor (replace UUID):
      // SELECT s.id AS student_id, s.user_id, p.id AS profile_id, p.full_name, p.email
      // FROM public.students s
      // LEFT JOIN public.profiles p ON p.id = s.user_id
      // WHERE s.id = 'PUT_STUDENT_ID_FROM_ROUTE_HERE';

      const { data: profile, error: profileError } =
        student.user_id == null || student.user_id === ""
          ? { data: null, error: null }
          : await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", student.user_id)
              .maybeSingle();

      console.log("profile result:", profile);
      console.log("profile error:", profileError ? JSON.stringify(profileError, null, 2) : "no error");

      if (!student.user_id) {
        console.warn("Student row has no user_id; cannot load profile (students.id):", student.id);
      } else if (!profile) {
        console.warn(
          "No profile row returned for student.user_id (missing FK target or RLS blocked SELECT):",
          student.user_id,
        );
      }

      const { data: additionalRow, error: additionalInfoError } = await supabase
        .from("student_additional_info")
        .select("gpa, technical_skills, taken_courses")
        .eq("user_id", student.user_id)
        .maybeSingle();

      if (additionalInfoError) {
        console.error("additional info error:", JSON.stringify(additionalInfoError, null, 2));
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

      // Applications history: v_application_student_details.student_id is s.id (students PK / applications.student_id), NOT user_id.
      // Department gate: use `student.department` from the row already loaded above. A second students query for department can return
      // null under RLS and would incorrectly clear all rows in finalApplications.
      console.log("student.id:", student.id);

      const { data: applications, error: applicationsError } = await supabase
        .from("v_application_student_details")
        .select(
          `
          application_id,
          internship_title,
          application_status,
          applied_at
        `,
        )
        .eq("student_id", id)
        .order("applied_at", { ascending: false });

      console.log("applications:", applications);

      if (applicationsError) {
        console.error("v_application_student_details error:", JSON.stringify(applicationsError, null, 2));
        setApplicationsQueryError(
          applicationsError.message || "Unable to load application history. Please try again.",
        );
        setApplications([]);
      } else {
        const finalApplications = departmentsMatch(student.department, supervisor.department)
          ? (applications ?? [])
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
          console.error("applications extras error:", JSON.stringify(extrasError, null, 2));
          setApplicationsQueryError(
            extrasError.message || "Unable to load company or message for applications.",
          );
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

  const applicationsTable = useMemo(() => applications, [applications]);

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-4xl">
        <PageHeader
          title="Student Details"
          description="Monitoring view for a student in your department."
          action={
            <Link href="/supervisor/students">
              <Button variant="secondary">Back to list</Button>
            </Link>
          }
        />
        {loading ? (
          <DetailPageSkeleton />
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : (
          <>
            <Card>
              <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Student info</h2>
              <div className="mt-3 grid gap-2 text-sm text-gray-700 transition-colors duration-300 dark:text-slate-300 sm:grid-cols-2">
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Full name:</span> {studentInfo?.full_name ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Email:</span> {studentInfo?.email ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">University:</span> {studentInfo?.university ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Department:</span> {studentInfo?.department ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Major:</span> {studentInfo?.major ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Year:</span> {studentInfo?.year ?? "—"}</p>
                <p className="sm:col-span-2"><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Bio:</span> {studentInfo?.bio ?? "—"}</p>
                {!studentInfo?.hasAdditionalInfoRow ? (
                  <p className="sm:col-span-2 text-slate-600 dark:text-slate-400">
                    No additional info provided
                  </p>
                ) : (
                  <>
                    <p className="sm:col-span-2"><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Academic Info:</span> GPA: {studentInfo?.gpa != null ? studentInfo.gpa : "Not provided"}</p>
                    <div className="sm:col-span-2">
                      <p className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Skills:</p>
                      {studentInfo && studentInfo.technical_skills.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {studentInfo.technical_skills.map((skill) => (
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
                    <div className="sm:col-span-2">
                      <p className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Taken Courses:</p>
                      {studentInfo && studentInfo.taken_courses.length > 0 ? (
                        <ul className="mt-1 list-inside list-disc space-y-1">
                          {studentInfo.taken_courses.map((course) => (
                            <li key={course}>{course}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1">No data</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </Card>
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Applications history</h2>
              {applicationsQueryError ? (
                <p
                  className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  role="alert"
                >
                  {applicationsQueryError}
                </p>
              ) : applicationsTable.length === 0 ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                  <svg
                    className="mb-5 h-12 w-12 text-slate-300 dark:text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No application history</h3>
                  <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-slate-400">
                    This student has not applied to any internships yet.
                  </p>
                </div>
              ) : (
                <div
                  className="animate-fade-up mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
                >
                  <table className="min-w-[44rem] w-full table-fixed border-collapse text-left sm:min-w-0 sm:table-auto">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/90 dark:border-slate-800 dark:bg-slate-800/80">
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600 sm:px-4 dark:text-slate-300"
                        >
                          Company
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600 sm:px-4 dark:text-slate-300"
                        >
                          Internship / Training
                        </th>
                        <th
                          scope="col"
                          className="w-[7.5rem] px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600 sm:px-4 dark:text-slate-300"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="w-40 px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600 sm:px-4 dark:text-slate-300"
                        >
                          Applied
                        </th>
                        <th
                          scope="col"
                          className="min-w-[8rem] px-3 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600 sm:px-4 dark:text-slate-300"
                        >
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {applicationsTable.map((application, index) => {
                        const isLatest = index === 0;
                        const msg = application.message;
                        const showMessage = hasApplicationMessage(msg);
                        return (
                          <tr
                            key={application.id}
                            className={`align-top transition-colors duration-200 ease-out hover:bg-violet-50/60 dark:hover:bg-slate-800/70 ${
                              isLatest
                                ? "bg-violet-50/50 ring-1 ring-inset ring-violet-200/60 dark:bg-violet-950/20 dark:ring-violet-500/25"
                                : ""
                            }`}
                          >
                            <td className="px-3 py-4 text-sm font-medium break-words text-gray-900 sm:px-4 dark:text-white">
                              <span className="line-clamp-2" title={application.company_name}>
                                {application.company_name}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-sm break-words text-gray-800 sm:px-4 dark:text-slate-200">
                              <span className="line-clamp-2" title={application.internship_title}>
                                {application.internship_title}
                              </span>
                            </td>
                            <td className="px-3 py-4 align-middle sm:px-4">
                              <ApplicationStatusBadge status={application.status} />
                            </td>
                            <td className="px-3 py-4 text-sm tabular-nums break-words text-gray-600 sm:px-4 dark:text-slate-400">
                              {formatApplicationDate(application.applied_at)}
                            </td>
                            <td className="max-w-[10rem] px-3 py-4 text-sm sm:max-w-xs sm:px-4">
                              {showMessage ? (
                                <p
                                  className="line-clamp-2 break-words text-gray-700 dark:text-slate-300"
                                  title={msg}
                                >
                                  {msg}
                                </p>
                              ) : (
                                <span className="text-slate-400 italic dark:text-slate-500">No message provided</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
