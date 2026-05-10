"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Container } from "@/components/layout/Container";
import { SupervisorAiInsights } from "@/components/supervisor/SupervisorAiInsights";
import { Button, EmptyState, Modal, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState("User");
  /** `undefined` = not loaded yet; empty string = loaded but no department */
  const [supervisorDepartment, setSupervisorDepartment] = useState<string | undefined>(undefined);
  const [assignedStudents, setAssignedStudents] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [rejectedApplications, setRejectedApplications] = useState(0);
  const [completedInternships, setCompletedInternships] = useState(0);
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([]);
  const [departmentInsightsEligible, setDepartmentInsightsEligible] = useState(false);

  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const [gettingStartedStep, setGettingStartedStep] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("supervisor dashboard getUser error:", userError);
        setError("Unable to load your account.");
        setSupervisorDepartment(undefined);
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access supervisor dashboard.");
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
        setError("Unable to load supervisor profile.");
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
        setRejectedApplications(0);
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
        setError("Unable to load assigned students.");
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
        setRejectedApplications(0);
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
      setRejectedApplications(safeApplications.filter((application) => application.status === "rejected").length);
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
        title: "Set your department & profile",
        description:
          "Your dashboard only includes students who share your academic department. Confirm department and title under Profile.",
        complete: deptDone,
        ctaLabel: deptDone ? "View profile" : "Complete profile",
        href: "/supervisor/profile",
      },
      {
        title: "Review your student roster",
        description: "See everyone in your department and open a student for more detail.",
        complete: rosterDone,
        ctaLabel: rosterDone ? "Open students" : "View students",
        href: "/supervisor/students",
      },
      {
        title: "Monitor department applications",
        description: "Read-only list of applications from your department students.",
        complete: appsDone,
        ctaLabel: appsDone ? "Open reports" : "Open reports",
        href: "/supervisor/reports",
      },
      {
        title: "Clear pending applications",
        description:
          pendingApplications > 0
            ? `You have ${pendingApplications} pending application${pendingApplications === 1 ? "" : "s"} in your department. Open the filtered report to review them (read-only).`
            : totalApplications === 0
              ? "Once students apply, pending counts appear here and in reports."
              : "No pending applications right now.",
        complete: noPendingHighlight || totalApplications === 0,
        ctaLabel: pendingApplications > 0 ? "View pending" : "Open reports",
        href: pendingApplications > 0 ? "/supervisor/reports?status=pending" : "/supervisor/reports",
      },
      {
        title: "Optional: AI department insights",
        description:
          departmentInsightsEligible && hasDepartment
            ? "Summaries appear below when enough evaluation data exists for your department."
            : "Insights unlock after your supervisor profile has a valid department.",
        complete: false,
        ctaLabel: "Scroll to insights",
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
    hasDepartment,
    assignedStudents,
    totalApplications,
    pendingApplications,
    departmentInsightsEligible,
  ]);

  const showEmptyStudents = useMemo(() => !loading && !error && assignedStudents === 0, [loading, error, assignedStudents]);

  const completionRateLabel = useMemo(() => {
    if (totalApplications === 0) return "—";
    const pct = (completedInternships / totalApplications) * 100;
    return `${pct.toFixed(1)}%`;
  }, [totalApplications, completedInternships]);

  const pendingReportsHref = "/supervisor/reports?status=pending";

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
                Welcome back, {supervisorName} 👋
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Monitor students in your department and their internship activity
              </p>
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
                Getting started
              </Button>
              <Link
                href="/supervisor/students"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                Students
              </Link>
              <Link
                href="/supervisor/reports"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                Reports
              </Link>
            </div>
          </div>
        </section>

        <Modal
          isOpen={gettingStartedOpen}
          onClose={() => setGettingStartedOpen(false)}
          title={`Getting started (${gettingStartedStep + 1}/${gettingStartedSteps.length})`}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setGettingStartedStep((s) => Math.max(0, s - 1))}
                disabled={gettingStartedStep === 0}
              >
                Back
              </Button>
              {gettingStartedSteps[gettingStartedStep]?.href ? (
                <Link href={gettingStartedSteps[gettingStartedStep]!.href!}>
                  <Button variant="secondary">Open</Button>
                </Link>
              ) : gettingStartedSteps[gettingStartedStep]?.scrollToInsights ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGettingStartedOpen(false);
                    document.getElementById("supervisor-ai-insights")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Go to insights
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
                {gettingStartedStep >= gettingStartedSteps.length - 1 ? "Finish" : "Next"}
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
                      {step.complete ? "Done" : "To do"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                  <p className="font-semibold">Your checklist</p>
                  <ul className="list-disc space-y-1 pl-5">
                    {gettingStartedSteps.map((s, idx) => (
                      <li key={s.title} className={idx === gettingStartedStep ? "font-medium" : ""}>
                        {s.title}{" "}
                        <span className="opacity-70">({s.complete ? "done" : "to do"})</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 text-sm text-gray-700 dark:border-purple-400/20 dark:bg-purple-500/10 dark:text-gray-200">
                  Tip: pending applications are highlighted on the dashboard; open the card or reports filter to review them.
                </div>
              </div>
            );
          })()}
        </Modal>

        {loading ? (
          <div className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="mt-4 h-9 w-14 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
            <div className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((item) => (
                  <div key={item} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="mt-3 h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : (
          <>
            {!hasDepartment && supervisorDepartment !== undefined ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                <p className="font-medium">Finish supervisor setup</p>
                <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
                  Set your academic department on your profile to see students and applications for your scope.
                </p>
                <Link
                  href="/supervisor/profile"
                  className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline underline-offset-2 hover:no-underline dark:text-amber-200"
                >
                  Open supervisor profile
                </Link>
              </div>
            ) : null}

            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <article className="animate-fade-up rounded-2xl bg-purple-100 p-6 text-purple-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-purple-500/10 dark:text-purple-300">
                <p className="text-sm font-medium">Students (your department)</p>
                <p className="mt-4 text-3xl font-bold">{assignedStudents}</p>
              </article>
              <article className="animate-fade-up rounded-2xl bg-indigo-100 p-6 text-indigo-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-indigo-500/10 dark:text-indigo-300">
                <p className="text-sm font-medium">Total applications</p>
                <p className="mt-4 text-3xl font-bold">{totalApplications}</p>
              </article>
              <article className="animate-fade-up rounded-2xl bg-green-100 p-6 text-green-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-green-500/10 dark:text-green-300">
                <p className="text-sm font-medium">Accepted</p>
                <p className="mt-4 text-3xl font-bold">{acceptedApplications}</p>
              </article>
              {pendingApplications > 0 ? (
                <Link
                  href={pendingReportsHref}
                  className="animate-fade-up block rounded-2xl bg-yellow-100 p-6 text-yellow-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600 focus-visible:ring-offset-2 dark:bg-yellow-500/10 dark:text-yellow-300 dark:focus-visible:ring-offset-gray-950"
                >
                  <p className="text-sm font-medium">Pending</p>
                  <p className="mt-4 text-3xl font-bold">{pendingApplications}</p>
                  <p className="mt-2 text-xs font-semibold text-yellow-900/80 underline underline-offset-2 dark:text-yellow-200/90">
                    View in reports →
                  </p>
                </Link>
              ) : (
                <article className="animate-fade-up rounded-2xl bg-yellow-100 p-6 text-yellow-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-yellow-500/10 dark:text-yellow-300">
                  <p className="text-sm font-medium">Pending</p>
                  <p className="mt-4 text-3xl font-bold">{pendingApplications}</p>
                </article>
              )}
              <article className="animate-fade-up rounded-2xl bg-red-100 p-6 text-red-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-red-500/10 dark:text-red-300">
                <p className="text-sm font-medium">Rejected</p>
                <p className="mt-4 text-3xl font-bold">{rejectedApplications}</p>
              </article>
            </section>
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Department Performance</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Aggregates for students in your department only (read-only).
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <article className="animate-fade-up rounded-2xl border border-gray-100 bg-sky-50 p-5 text-sky-950 shadow-sm transition-all duration-300 dark:border-sky-900/40 dark:bg-sky-500/10 dark:text-sky-100">
                  <p className="text-sm font-medium text-sky-900 dark:text-sky-200">Total students</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{assignedStudents}</p>
                </article>
                <article className="animate-fade-up rounded-2xl border border-gray-100 bg-slate-50 p-5 text-slate-900 shadow-sm transition-all duration-300 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Total applications</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{totalApplications}</p>
                </article>
                <article className="animate-fade-up rounded-2xl border border-gray-100 bg-teal-50 p-5 text-teal-950 shadow-sm transition-all duration-300 dark:border-teal-900/40 dark:bg-teal-500/10 dark:text-teal-100">
                  <p className="text-sm font-medium text-teal-900 dark:text-teal-200">Completed internships</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{completedInternships}</p>
                </article>
                <article className="animate-fade-up rounded-2xl border border-gray-100 bg-violet-50 p-5 text-violet-950 shadow-sm transition-all duration-300 dark:border-violet-900/40 dark:bg-violet-500/10 dark:text-violet-100">
                  <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Completion rate</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{completionRateLabel}</p>
                  {totalApplications === 0 ? (
                    <p className="mt-1 text-xs text-violet-700/80 dark:text-violet-300/80">No applications yet</p>
                  ) : (
                    <p className="mt-1 text-xs text-violet-700/80 dark:text-violet-300/80">
                      Completed ÷ all department applications
                    </p>
                  )}
                </article>
              </div>
            </section>
            <div id="supervisor-ai-insights">
              <SupervisorAiInsights eligible={departmentInsightsEligible} className="mt-8" />
            </div>
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Students Overview</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Latest students in your department — select a row to open detail
              </p>
              {showEmptyStudents ? (
                <EmptyState
                  className="mt-4"
                  title="No data yet"
                  description="No students in your department yet."
                  actionLabel="View students"
                  actionHref="/supervisor/students"
                />
              ) : previewStudents.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No data yet.</p>
              ) : (
                <Table
                  headers={["Student", "Email", "University", "Department", "Major"]}
                  className="mt-4 rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80 [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-gray-500 dark:[&_th]:text-gray-300 [&_tbody]:bg-white dark:[&_tbody]:bg-gray-900"
                >
                  {previewStudents.map((student) => (
                    <tr
                      key={student.id}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open student ${student.full_name}`}
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
          </>
        )}
      </Container>
    </div>
  );
}
