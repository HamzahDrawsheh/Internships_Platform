"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, EmptyState, Modal, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Position = { id: string; title: string };
type Application = {
  id: string;
  student_id: string;
  position_id: string;
  internship_title: string;
  status: "pending" | "accepted" | "rejected";
  applied_at: string;
};
type StudentDetail = {
  fullName: string;
  email: string;
  university: string;
  department: string;
  major: string;
  cvUrl: string | null;
  year: string;
  bio: string;
  gpa: number | null;
  technicalSkills: string[];
  takenCourses: string[];
};

export default function CompanyApplicationsPage() {
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
        .select("id, title")
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
        status: "pending" | "accepted" | "rejected";
        applied_at: string;
      }[];

      const studentIds = [...new Set(baseApps.map((a) => a.student_id))];

      const { data: studentsData, error: studentsError } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, user_id, university, department, major, preferences, cv_url")
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
        cv_url: string | null;
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
          fullName: profile?.full_name?.trim() || "Student",
          email: profile?.email ?? "—",
          university: s.university ?? "—",
          department: (s.department as string | null | undefined)?.trim() || "—",
          major: s.major ?? "—",
          cvUrl: s.cv_url ?? null,
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

  const updateApplicationStatus = async (status: "accepted" | "rejected") => {
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
        .select("id")
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

      if (appRow.status !== "pending") {
        setError("This application has already been finalized.");
        return;
      }

      const { error: updateError } = await supabase
        .from("applications")
        .update({ status })
        .eq("id", selectedApplicationId);
      if (updateError) {
        console.error("company applications status update query error:", updateError);
        setError("Failed to update application status.");
        return;
      }

      const { data: studentRow, error: studentLookupError } = await supabase
        .from("students")
        .select("user_id")
        .eq("id", appRow.student_id)
        .maybeSingle();
      if (studentLookupError) {
        console.error("company applications notification student lookup error:", studentLookupError);
      }

      const targetUserId = studentRow?.user_id ?? null;
      const internshipTitle =
        appRow.position_id
          ? titleByPositionId.get(appRow.position_id) ?? "Internship"
          : "Internship";

      if (targetUserId) {
        const message =
          status === "accepted"
            ? `🎉 Your application for ${internshipTitle} at ${companyName} has been accepted.`
            : `❌ Your application for ${internshipTitle} at ${companyName} has been rejected.`;

        const { error: notificationError } = await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: status === "accepted" ? "Application accepted" : "Application rejected",
          message,
          type: status,
          is_read: false,
          related_application_id: selectedApplicationId,
        });

        if (notificationError) {
          console.error("company applications notification insert error:", notificationError);
          setError("Application updated, but failed to notify the student.");
        }
      }

      setApplications((prev) =>
        prev.map((application) =>
          application.id === selectedApplicationId ? { ...application, status } : application
        )
      );
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
    <Container>
      <PageHeader
        title="Applications"
        description="All applications received for your internship posts."
      />

      {loading ? (
        <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading applications...</p>
      ) : error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Applications will appear here once students apply."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <Table
            headers={["Student", "University", "Department", "Internship", "Applied", "Status", "Actions"]}
            className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
          >
            {applications.map((application) => (
              <tr key={application.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">
                  {studentDetailById.get(application.student_id)?.fullName ?? "Student"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {studentDetailById.get(application.student_id)?.university ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {studentDetailById.get(application.student_id)?.department ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">
                  {application.internship_title}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {new Date(application.applied_at).toLocaleDateString()}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {application.status}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedApplicationId(application.id);
                      setDetailOpen(true);
                    }}
                  >
                    View details
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Application details"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDetailOpen(false)} disabled={actionLoading}>
              Close
            </Button>
            <Button
              variant="danger"
              onClick={() => updateApplicationStatus("rejected")}
              disabled={actionLoading || !selectedApplication || selectedApplication.status !== "pending"}
            >
              {actionLoading ? "Updating..." : "Reject"}
            </Button>
            <Button
              variant="primary"
              onClick={() => updateApplicationStatus("accepted")}
              disabled={actionLoading || !selectedApplication || selectedApplication.status !== "pending"}
            >
              {actionLoading ? "Updating..." : "Accept"}
            </Button>
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
            <p>
              <span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">CV:</span>{" "}
              {selectedStudent?.cvUrl ? (
                <a
                  href={selectedStudent.cvUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#7C3AED] hover:underline"
                >
                  Open CV
                </a>
              ) : (
                "Not provided"
              )}
            </p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Internship:</span> {selectedApplication.internship_title}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Applied:</span> {new Date(selectedApplication.applied_at).toLocaleDateString()}</p>
            <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Status:</span> <span className="capitalize">{selectedApplication.status}</span></p>
            {selectedApplication.status !== "pending" && (
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
