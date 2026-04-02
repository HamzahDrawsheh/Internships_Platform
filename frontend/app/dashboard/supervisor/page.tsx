"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { EmptyState, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type PreviewStudent = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  university: string;
  major: string;
};

export default function SupervisorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState("User");
  const [assignedStudents, setAssignedStudents] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [acceptedApplications, setAcceptedApplications] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [rejectedApplications, setRejectedApplications] = useState(0);
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([]);

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
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access supervisor dashboard.");
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
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor dashboard supervisor query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }

      if (!supervisor) {
        setAssignedStudents(0);
        setTotalApplications(0);
        setAcceptedApplications(0);
        setPendingApplications(0);
        setRejectedApplications(0);
        setPreviewStudents([]);
        setLoading(false);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, major, created_at")
        .eq("supervisor_id", supervisor.id)
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
          major: string | null;
          created_at: string;
        }[];
      setAssignedStudents(safeStudents.length);

      if (safeStudents.length === 0) {
        setTotalApplications(0);
        setAcceptedApplications(0);
        setPendingApplications(0);
        setRejectedApplications(0);
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

      const safeApplications = (applicationsData ?? []) as { status: "pending" | "accepted" | "rejected"; student_id: string }[];
      setTotalApplications(safeApplications.length);
      setAcceptedApplications(safeApplications.filter((application) => application.status === "accepted").length);
      setPendingApplications(safeApplications.filter((application) => application.status === "pending").length);
      setRejectedApplications(safeApplications.filter((application) => application.status === "rejected").length);

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
          major: student.major ?? "—",
        };
      });
      setPreviewStudents(mappedPreview);

      setLoading(false);
    };

    loadDashboard();
  }, []);

  const showEmptyStudents = useMemo(() => !loading && !error && assignedStudents === 0, [loading, error, assignedStudents]);

  return (
    <main className="py-6 sm:py-8">
      <Container>
        <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
                Welcome back, {supervisorName} 👋
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Monitor your assigned students and internship activity
              </p>
            </div>
          </div>
        </section>
        {loading ? (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">Loading dashboard...</p>
        ) : error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <article className="animate-fade-up rounded-2xl bg-purple-100 p-6 text-purple-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-purple-500/10 dark:text-purple-300">
                <p className="text-sm font-medium">Assigned students</p>
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
              <article className="animate-fade-up rounded-2xl bg-yellow-100 p-6 text-yellow-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-yellow-500/10 dark:text-yellow-300">
                <p className="text-sm font-medium">Pending</p>
                <p className="mt-4 text-3xl font-bold">{pendingApplications}</p>
              </article>
              <article className="animate-fade-up rounded-2xl bg-red-100 p-6 text-red-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:bg-red-500/10 dark:text-red-300">
                <p className="text-sm font-medium">Rejected</p>
                <p className="mt-4 text-3xl font-bold">{rejectedApplications}</p>
              </article>
            </section>
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Students Overview</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Latest assigned students</p>
              {showEmptyStudents ? (
                <EmptyState
                  className="mt-4"
                  title="No data yet"
                  description="No students assigned yet."
                  actionLabel="View students"
                  actionHref="/supervisor/students"
                />
              ) : previewStudents.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No data yet.</p>
              ) : (
                <Table
                  headers={["Student", "Email", "University", "Major"]}
                  className="mt-4 rounded-2xl border-gray-200 shadow-sm dark:border-gray-700 [&_thead]:bg-gray-50 dark:[&_thead]:bg-gray-800/80 [&_th]:font-semibold [&_th]:tracking-wide [&_th]:text-gray-500 dark:[&_th]:text-gray-300 [&_tbody]:bg-white dark:[&_tbody]:bg-gray-900"
                >
                  {previewStudents.map((student) => (
                    <tr key={student.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{student.full_name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.email}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.university}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">{student.major}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
