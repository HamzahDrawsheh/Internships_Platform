"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Table, EmptyState, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type StudentRow = {
  id: string;
  full_name: string;
  email: string;
  university: string;
  department: string;
  major: string;
  year: string;
  status: string;
};

export default function StudentsListPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadStudents = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("supervisor students getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access supervisor pages.");
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
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }

      if (!supervisor?.department) {
        setError("Supervisor profile or department not found. Complete onboarding or update your supervisor profile.");
        setLoading(false);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, department, major, preferences")
        .eq("department", supervisor.department);

      if (studentsError) {
        console.error("supervisor students list query error:", studentsError);
        setError("Unable to load assigned students.");
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
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };

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

      const statusByStudentId = new Map<string, string>();
      (applicationsData ?? []).forEach((application) => {
        const current = statusByStudentId.get(application.student_id);
        if (application.status === "completed") {
          statusByStudentId.set(application.student_id, "Completed");
          return;
        }
        if (application.status === "accepted" && current !== "Completed") {
          statusByStudentId.set(application.student_id, "Active");
          return;
        }
        if (!current && application.status === "pending") {
          statusByStudentId.set(application.student_id, "Pending");
          return;
        }
        if (!current && application.status === "rejected") {
          statusByStudentId.set(application.student_id, "Rejected");
        }
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
          status: statusByStudentId.get(student.id) ?? "No applications",
        };
      });

      setRows(mappedRows);
      setLoading(false);
    };

    loadStudents();
  }, []);

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Students List"
          description="Students in your academic department: applications, acceptance count, and placement status."
        />
        {loading ? (
          <TableListPageSkeleton />
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No students in your department yet"
            description="Students who select the same academic department as you will appear here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Table
              headers={["Student", "Email", "University", "Department", "Major", "Year", "Status", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {rows.map((student) => (
                <tr key={student.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{student.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.university}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.major}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.year}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.status}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/supervisor/students/${student.id}`}>
                      <Button variant="secondary">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Container>
    </main>
  );
}
