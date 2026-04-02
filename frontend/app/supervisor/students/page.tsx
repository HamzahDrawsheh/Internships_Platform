"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, EmptyState, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type StudentRow = {
  id: string;
  full_name: string;
  email: string;
  university: string;
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
      console.log("[supervisor-students] auth user result", { userId: user?.id ?? null, userError });

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
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      console.log("[supervisor-students] supervisor select result", {
        supervisor,
        supervisorError,
      });

      const isMissingSupervisorRow = !supervisor && (!supervisorError || supervisorError.code === "PGRST116");
      if (isMissingSupervisorRow) {
        console.log("[supervisor-students] supervisor row missing; will attempt create", {
          userId: user.id,
        });
      }

      if (supervisorError && supervisorError.code !== "PGRST116") {
        console.error("supervisor students supervisor query error:", supervisorError);
        setError("Unable to load supervisor profile.");
        setLoading(false);
        return;
      }
      let supervisorId = supervisor?.id ?? null;
      if (!supervisorId) {
        const { data: createdSupervisor, error: createSupervisorError } = await supabase
          .from("supervisors")
          .insert({
            user_id: user.id,
            department: null,
            title: null,
          })
          .select("id")
          .single();
        console.log("[supervisor-students] supervisor insert result", {
          createdSupervisor,
          createSupervisorError,
        });

        if (createSupervisorError) {
          console.error("supervisor students create supervisor error:", createSupervisorError);

          // Handle race condition where another request created the row first.
          const { data: existingSupervisor, error: retrySupervisorError } = await supabase
            .from("supervisors")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();
          console.log("[supervisor-students] supervisor retry fetch result", {
            existingSupervisor,
            retrySupervisorError,
          });

          if (retrySupervisorError && retrySupervisorError.code !== "PGRST116") {
            console.error("supervisor students retry supervisor fetch error:", retrySupervisorError);
            setError("Unable to initialize supervisor profile.");
            setLoading(false);
            return;
          }

          if (!existingSupervisor) {
            console.error(
              "supervisor students unrecoverable supervisor init failure: missing row after create + retry",
              createSupervisorError
            );
            setError("Unable to initialize supervisor profile.");
            setLoading(false);
            return;
          }

          supervisorId = existingSupervisor.id;
        } else {
          supervisorId = createdSupervisor.id;
        }
      }
      console.log("[supervisor-students] using supervisor id", supervisorId);

      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, user_id, university, major, preferences")
        .eq("supervisor_id", supervisorId);
      console.log("[supervisor-students] students query result count", (studentsData ?? []).length);

      if (studentsError) {
        console.error("supervisor students list query error:", studentsError);
        setError("Unable to load assigned students.");
        setLoading(false);
        return;
      }

      const safeStudents =
        (studentsData as { id: string; user_id: string; university: string | null; major: string | null; preferences: string | null }[]) ?? [];
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
        : { data: [] as { student_id: string; status: "pending" | "accepted" | "rejected" }[], error: null };

      if (applicationsError) {
        console.error("supervisor students applications query error:", applicationsError);
      }

      const statusByStudentId = new Map<string, string>();
      (applicationsData ?? []).forEach((application) => {
        const current = statusByStudentId.get(application.student_id);
        if (application.status === "accepted") {
          statusByStudentId.set(application.student_id, "Accepted");
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
          description="Assigned students: applications, acceptance count, and placement status."
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading assigned students...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No students assigned yet"
            description="Assigned students will appear here once supervisor assignments are available."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Table
              headers={["Student", "Email", "University", "Major", "Year", "Status", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {rows.map((student) => (
                <tr key={student.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{student.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{student.university}</td>
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
