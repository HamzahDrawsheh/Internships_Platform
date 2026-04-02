"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function StudentDetailsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentInfo, setStudentInfo] = useState<{
    student_id: string;
    full_name: string;
    email: string;
    university: string;
    major: string;
    year: string;
    skills: string;
    bio: string;
  } | null>(null);
  const [applications, setApplications] = useState<
    {
      id: string;
      applied_at: string;
      status: "pending" | "accepted" | "rejected";
      internship_title: string;
      company_name: string;
    }[]
  >([]);
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  useEffect(() => {
    const supabase = createClient();

    const loadDetails = async () => {
      setLoading(true);
      setError(null);

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
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (supervisorError) {
        console.error("supervisor student details supervisor query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }
      if (!supervisor) {
        setError("Supervisor profile not found.");
        setLoading(false);
        return;
      }

      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, user_id, supervisor_id, university, major, skills, preferences")
        .eq("id", id)
        .maybeSingle();
      if (studentError) {
        console.error("supervisor student details student query error:", studentError);
        setError("Unable to load student details.");
        setLoading(false);
        return;
      }
      if (!student || student.supervisor_id !== supervisor.id) {
        setError("Access denied or student not found.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", student.user_id)
        .maybeSingle();
      if (profileError) {
        console.error("supervisor student details profile query error:", profileError);
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

      setStudentInfo({
        student_id: student.id,
        full_name: profile?.full_name?.trim() || "—",
        email: profile?.email ?? "—",
        university: student.university ?? "—",
        major: student.major ?? "—",
        year,
        skills: student.skills ?? "—",
        bio,
      });

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("id, position_id, status, applied_at")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false });
      if (appError) {
        console.error("supervisor student details applications query error:", appError);
        setError("Unable to load application history.");
        setLoading(false);
        return;
      }

      const safeApps = (appRows ??
        []) as {
        id: string;
        position_id: string;
        status: "pending" | "accepted" | "rejected";
        applied_at: string;
      }[];

      if (safeApps.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const positionIds = [...new Set(safeApps.map((app) => app.position_id))];
      const { data: positions, error: positionsError } = await supabase
        .from("internship_positions")
        .select("id, title, company_id")
        .in("id", positionIds);
      if (positionsError) {
        console.error("supervisor student details positions query error:", positionsError);
      }
      const positionById = new Map((positions ?? []).map((position) => [position.id, position]));

      const companyIds = [...new Set((positions ?? []).map((position) => position.company_id))];
      const { data: companies, error: companiesError } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string }[], error: null };
      if (companiesError) {
        console.error("supervisor student details companies query error:", companiesError);
      }
      const companyNameById = new Map((companies ?? []).map((company) => [company.id, company.company_name]));

      setApplications(
        safeApps.map((application) => {
          const position = positionById.get(application.position_id);
          return {
            id: application.id,
            applied_at: application.applied_at,
            status: application.status,
            internship_title: position?.title ?? "—",
            company_name: position ? companyNameById.get(position.company_id) ?? "—" : "—",
          };
        })
      );
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
          description="Monitoring view for assigned student."
          action={
            <Link href="/supervisor/students">
              <Button variant="secondary">Back to list</Button>
            </Link>
          }
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading student details...</p>
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
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Major:</span> {studentInfo?.major ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Year:</span> {studentInfo?.year ?? "—"}</p>
                <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Skills:</span> {studentInfo?.skills ?? "—"}</p>
                <p className="sm:col-span-2"><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Bio:</span> {studentInfo?.bio ?? "—"}</p>
              </div>
            </Card>
            <section className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Applications history</h2>
              {applicationsTable.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="No application history"
                  description="This student has not applied to any internships yet."
                />
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  <Table
                    headers={["Internship", "Company", "Applied", "Status"]}
                    className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
                  >
                    {applicationsTable.map((application) => (
                      <tr key={application.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{application.internship_title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{application.company_name}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                          {formatDate(application.applied_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">{application.status}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
