"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Table, Modal, Textarea, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export default function ApplicantsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [detailOpen, setDetailOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Applicants");
  const [companyName, setCompanyName] = useState("Company");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState<
    {
      id: string;
      student_id: string;
      student_user_id: string;
      status: "pending" | "accepted" | "rejected";
      applied_at: string;
      message: string | null;
      student_name: string;
      university: string;
      major: string;
      year: string;
      bio: string;
      cv_url: string | null;
      internship_title: string;
      gpa: number | null;
      technical_skills: string[];
      taken_courses: string[];
    }[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !id) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id, company_name")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setRows([]);
        setLoading(false);
        return;
      }
      setCompanyName(company.company_name?.trim() || "Company");

      const { data: position } = await supabase
        .from("internship_positions")
        .select("id, title")
        .eq("id", id)
        .eq("company_id", company.id)
        .single();

      if (!position) {
        setRows([]);
        setLoading(false);
        return;
      }

      setTitle(position.title);

      const { data: apps } = await supabase
        .from("applications")
        .select("id, student_id, status, applied_at, message")
        .eq("position_id", position.id)
        .order("applied_at", { ascending: false });
      console.log("[company-position-applicants] raw applications response", apps);

      const baseApps = apps ?? [];
      const studentIds = [...new Set(baseApps.map((a) => a.student_id))];
      const { data: students, error: studentsError } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, user_id, university, major, skills, preferences, cv_url")
            .in("id", studentIds)
        : {
            data: [] as {
              id: string;
              user_id: string;
              university: string | null;
              major: string | null;
              skills: string | null;
              preferences: string | null;
              cv_url: string | null;
            }[],
            error: null,
          };
      console.log("[company-position-applicants] raw students response", students);
      if (studentsError) {
        console.error("company applicants students query error:", studentsError);
      }
      const studentById = new Map((students ?? []).map((s) => [s.id, s]));

      const userIds = [...new Set((students ?? []).map((s) => s.user_id))];
      const { data: additionalInfoRows, error: additionalInfoError } = userIds.length
        ? await supabase
            .from("student_additional_info")
            .select("user_id, gpa, technical_skills, taken_courses")
            .in("user_id", userIds)
        : {
            data: [] as {
              user_id: string;
              gpa: number | null;
              technical_skills: string[] | null;
              taken_courses: string[] | null;
            }[],
            error: null,
          };
      if (additionalInfoError) {
        console.error("company applicants additional info query error:", additionalInfoError);
      }
      const additionalInfoByUserId = new Map((additionalInfoRows ?? []).map((item) => [item.user_id, item]));

      const { data: profiles, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };
      console.log("[company-position-applicants] raw profiles response", profiles);
      if (profilesError) {
        console.error("company applicants profiles query error:", profilesError);
      }
      const profileByUserId = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          {
            fullName: p.full_name?.trim() || null,
            email: p.email ?? null,
          },
        ])
      );

      setRows(
        baseApps.map((app) => {
          const student = studentById.get(app.student_id);
          let year = "—";
          let bio = "—";
          if (student?.preferences) {
            try {
              const parsed = JSON.parse(student.preferences) as { year?: string | null; bio?: string | null };
              year = parsed?.year?.trim() ? parsed.year : "—";
              bio = parsed?.bio?.trim() ? parsed.bio : "—";
            } catch {
              bio = student.preferences;
            }
          }
          const profile = student ? profileByUserId.get(student.user_id) : null;
          const additionalInfo = student ? additionalInfoByUserId.get(student.user_id) : null;
          const fallbackFromEmail =
            profile?.email && profile.email.includes("@") ? profile.email.split("@")[0] : "Student";
          const resolvedStudentName = profile?.fullName ?? fallbackFromEmail;
          return {
            id: app.id,
            student_id: app.student_id,
            student_user_id: student?.user_id ?? "",
            status: app.status,
            applied_at: app.applied_at,
            message: app.message,
            student_name: resolvedStudentName,
            university: student?.university ?? "—",
            major: student?.major ?? "—",
            year,
            bio,
            cv_url: student?.cv_url ?? null,
            internship_title: position.title,
            gpa: additionalInfo?.gpa ?? null,
            technical_skills: additionalInfo?.technical_skills ?? [],
            taken_courses: additionalInfo?.taken_courses ?? [],
          };
        })
      );
      console.log("[company-position-applicants] merged applicant rows", baseApps.length);
      setLoading(false);
    };

    load();
  }, [id]);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  const handleViewDetails = (applicationId: string) => {
    setSelectedId(applicationId);
    setActionMessage(null);
    setDetailOpen(true);
  };

  const updateStatus = async (applicationId: string, status: "accepted" | "rejected") => {
    setActionMessage(null);
    setActionLoading(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (userError) {
        console.error("company applicants update user error:", userError);
      }
      setActionMessage("You must be logged in to update applications.");
      setActionLoading(false);
      return;
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (companyError || !company) {
      if (companyError) {
        console.error("company applicants update company error:", companyError);
      }
      setActionMessage("Unable to verify your company account.");
      setActionLoading(false);
      return;
    }

    const { data: appRow, error: appError } = await supabase
      .from("applications")
      .select("id, student_id, position_id, status")
      .eq("id", applicationId)
      .maybeSingle();
    if (appError || !appRow) {
      if (appError) {
        console.error("company applicants update application error:", appError);
      }
      setActionMessage("Application not found.");
      setActionLoading(false);
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
        console.error("company applicants ownership check error:", ownedPositionError);
      }
      setActionMessage("You can only manage applications for your own internships.");
      setActionLoading(false);
      return;
    }

    if (appRow.status !== "pending") {
      setActionMessage("This application has already been finalized.");
      setActionLoading(false);
      return;
    }

    const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
    if (error) {
      console.error("company applicants update status error:", error);
      setActionMessage("Failed to update application status.");
      setActionLoading(false);
      return;
    }

    const row = rows.find((item) => item.id === applicationId);
    const { data: studentRow, error: studentLookupError } = await supabase
      .from("students")
      .select("user_id")
      .eq("id", appRow.student_id)
      .maybeSingle();

    if (studentLookupError) {
      console.error("company applicants notification student lookup error:", studentLookupError);
    }

    if (studentRow?.user_id) {
      const internshipTitle = row?.internship_title ?? title ?? "Internship";
      const message =
        status === "accepted"
          ? `🎉 Your application for ${internshipTitle} at ${companyName} has been accepted.`
          : `❌ Your application for ${internshipTitle} at ${companyName} has been rejected.`;

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: studentRow.user_id,
        title: status === "accepted" ? "Application accepted" : "Application rejected",
        message,
        type: status,
        is_read: false,
        related_application_id: applicationId,
      });

      if (notificationError) {
        console.error("company applicants notification insert error:", notificationError);
        setActionMessage("Status updated, but failed to notify the student.");
      }
    }

    setRows((prev) => prev.map((row) => (row.id === applicationId ? { ...row, status } : row)));
    setActionMessage(`Application marked as ${status}.`);
    setActionLoading(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Applicants"
          description={id ? `Internship applicants for "${title}"` : "Applicants for this internship."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Back to internships</Button>
            </Link>
          }
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading applicants...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="Applicants will appear here when students apply."
          />
        ) : (
          <Table headers={["Student name", "University / major / year", "Skills", "Status", "Actions"]}>
            {rows.map((app) => (
              <tr key={app.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{app.student_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{`${app.university} / ${app.major} / ${app.year}`}</td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{app.skills}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">{app.status}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      onClick={() => updateStatus(app.id, "accepted")}
                      disabled={actionLoading || app.status !== "pending"}
                    >
                      {actionLoading ? "Updating..." : "Accept"}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => updateStatus(app.id, "rejected")}
                      disabled={actionLoading || app.status !== "pending"}
                    >
                      {actionLoading ? "Updating..." : "Reject"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleViewDetails(app.id)}
                    >
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Applicant detail"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailOpen(false)} disabled={actionLoading}>Close</Button>
              <Button
                variant="danger"
                onClick={() => selected && updateStatus(selected.id, "rejected")}
                disabled={actionLoading || !selected || selected.status !== "pending"}
              >
                {actionLoading ? "Updating..." : "Reject"}
              </Button>
              <Button
                variant="primary"
                onClick={() => selected && updateStatus(selected.id, "accepted")}
                disabled={actionLoading || !selected || selected.status !== "pending"}
              >
                {actionLoading ? "Updating..." : "Accept"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
            {selected
              ? `Applied on ${new Date(selected.applied_at).toLocaleDateString()}`
              : "Applicant details"}
          </p>
          {selected?.message && (
            <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-300">
              {selected.message}
            </div>
          )}
          {actionMessage && (
            <div className="mt-3 rounded-md bg-blue-50 p-3 text-sm text-blue-800 transition-colors duration-300 dark:border dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
              {actionMessage}
            </div>
          )}
          {selected && (
            <div className="mt-4 grid gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700 transition-colors duration-300 dark:bg-slate-800 dark:text-slate-300 sm:grid-cols-2">
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Internship:</span> {selected.internship_title || "—"}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Status:</span> <span className="capitalize">{selected.status}</span></p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Student:</span> {selected.student_name}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">University:</span> {selected.university}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Major:</span> {selected.major}</p>
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Year:</span> {selected.year}</p>
              <p className="sm:col-span-2"><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Bio:</span> {selected.bio}</p>
              <p className="sm:col-span-2"><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Academic Info:</span> GPA: {selected.gpa != null ? selected.gpa : "Not provided"}</p>
              <div className="sm:col-span-2">
                <p className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Skills:</p>
                {selected.technical_skills.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.technical_skills.map((skill) => (
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
                {selected.taken_courses.length > 0 ? (
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {selected.taken_courses.map((course) => (
                      <li key={course}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1">No data</p>
                )}
              </div>
              <p className="sm:col-span-2">
                <span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">CV:</span>{" "}
                {selected.cv_url ? (
                  <a href={selected.cv_url} target="_blank" rel="noreferrer" className="text-[#7C3AED] hover:underline">
                    Open CV
                  </a>
                ) : (
                  "—"
                )}
              </p>
            </div>
          )}
          <Textarea label="Internal notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
        </Modal>
      </Container>
    </main>
  );
}
