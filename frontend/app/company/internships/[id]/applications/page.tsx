"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import ApplicationStatusBadge from "@/components/applications/ApplicationStatusBadge";
import { Button, Input, Modal, Select, Table, EmptyState } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import {
  buildCompanyApplicationStatusNotification,
  isValidCompanyDispatchPayload,
  type CompanyNotifyApplicationStatus,
} from "@/lib/notifications/company-application-status";
import { dispatchNotification } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase/client";
import { openCompanyApplicantCv } from "@/lib/open-company-cv";
import {
  buildCompanyStatusPatch,
  canCompanyTransitionStatus,
  COMMITMENT_PENDING_STATUS,
} from "@/lib/applications/commitment";
import type { ApplicationStatus } from "@/lib/types";

export default function ApplicantsPage() {
  const { locale, t } = useI18n();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Applicants");
  const [companyName, setCompanyName] = useState("Company");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cvOpeningId, setCvOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ApplicationStatus>("");
  const [hasCvFilter, setHasCvFilter] = useState<"" | "yes" | "no">("");
  const [rows, setRows] = useState<
    {
      id: string;
      student_id: string;
      student_user_id: string;
      status: ApplicationStatus;
      applied_at: string;
      message: string | null;
      student_name: string;
      university: string;
      department: string;
      major: string;
      year: string;
      bio: string;
      cv_path: string | null;
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
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !id) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) {
        console.error("company applicants role error:", profileError);
        setError("Unable to verify your role.");
        setRows([]);
        setLoading(false);
        return;
      }
      if (profile?.role !== "company") {
        setError("Only company accounts can view applicants.");
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
        setError("Company profile not found.");
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

      const baseApps = apps ?? [];
      const studentIds = [...new Set(baseApps.map((a) => a.student_id))];
      const { data: students, error: studentsError } = studentIds.length
        ? await supabase
            .from("students")
            .select("id, user_id, university, department, major, skills, preferences, cv_path")
            .in("id", studentIds)
        : {
            data: [] as {
              id: string;
              user_id: string;
              university: string | null;
              department: string | null;
              major: string | null;
              skills: string | null;
              preferences: string | null;
              cv_path: string | null;
            }[],
            error: null,
          };
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
            department: student?.department ?? "—",
            major: student?.major ?? "—",
            year,
            bio,
            cv_path: student?.cv_path ?? null,
            internship_title: position.title,
            gpa: additionalInfo?.gpa ?? null,
            technical_skills: additionalInfo?.technical_skills ?? [],
            taken_courses: additionalInfo?.taken_courses ?? [],
          };
        })
      );
      setLoading(false);
    };

    load();
  }, [id]);

  const selected = useMemo(() => rows.find((row) => row.id === selectedId) ?? null, [rows, selectedId]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      const hasCv = Boolean(r.cv_path && r.cv_path.trim());
      if (hasCvFilter === "yes" && !hasCv) return false;
      if (hasCvFilter === "no" && hasCv) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        r.university.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.major.toLowerCase().includes(q) ||
        r.year.toLowerCase().includes(q) ||
        r.internship_title.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter, hasCvFilter]);

  const handleOpenApplicantCv = async (applicationId: string) => {
    setCvOpeningId(applicationId);
    setActionMessage(null);
    try {
      await openCompanyApplicantCv(applicationId);
    } catch (e) {
      setActionMessage(e instanceof Error ? e.message : "Could not open CV.");
    } finally {
      setCvOpeningId(null);
    }
  };

  const handleViewDetails = (applicationId: string) => {
    setSelectedId(applicationId);
    setActionMessage(null);
    setDetailOpen(true);
  };

  const updateStatus = async (applicationId: string, status: ApplicationStatus) => {
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
      .select("id, duration_weeks, duration")
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

    if (!canCompanyTransitionStatus(appRow.status, status)) {
      setActionMessage("Invalid status transition for this application.");
      setActionLoading(false);
      return;
    }

    if (status === "accepted") {
      const { data: committedApps, error: committedError } = await supabase
        .from("applications")
        .select("id")
        .eq("student_id", appRow.student_id)
        .eq("status", "accepted")
        .limit(1);
      if (committedError) {
        console.error("company applicants committed check error:", committedError);
      }
      if (committedApps?.length) {
        setActionMessage("This student has already committed to another internship.");
        setActionLoading(false);
        return;
      }
    }

    const applicationPatch = buildCompanyStatusPatch(status);

    const { error } = await supabase.from("applications").update(applicationPatch).eq("id", applicationId);
    if (error) {
      console.error("company applicants update status error:", error);
      setActionMessage("Failed to update application status.");
      setActionLoading(false);
      return;
    }

    const { data: studentRow, error: studentLookupError } = await supabase
      .from("students")
      .select("user_id")
      .eq("id", appRow.student_id)
      .maybeSingle();

    if (studentLookupError) {
      console.error("company applicants notification student lookup error:", studentLookupError);
    }

    const notifyStatus: CompanyNotifyApplicationStatus | null =
      status === "accepted"
        ? "accepted"
        : status === "rejected"
          ? "rejected"
          : status === "completed"
            ? "completed"
            : null;

    if (notifyStatus && studentRow?.user_id) {
      const content = buildCompanyApplicationStatusNotification(
        notifyStatus,
        companyName,
        locale,
        applicationId
      );

      const notificationPayload = {
        recipientUserId: studentRow.user_id,
        ...content,
      };

      if (isValidCompanyDispatchPayload(notificationPayload)) {
        const notifyResult = await dispatchNotification(notificationPayload);

        if (!notifyResult.ok) {
          console.error("company applicants notification error:", notifyResult.error);
          setActionMessage(t("companyApplications.notifyFailed"));
        }
      } else {
        console.error("company applicants invalid notification payload:", notificationPayload);
        setActionMessage(t("companyApplications.notifyFailed"));
      }
    }

    const storedStatus = status === "accepted" ? COMMITMENT_PENDING_STATUS : status;
    setRows((prev) =>
      prev.map((row) => (row.id === applicationId ? { ...row, status: storedStatus } : row))
    );
    setActionMessage(
      status === "accepted"
        ? "Offer sent — awaiting student confirmation (3 days)."
        : `Application marked as ${status}.`
    );
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
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </div>
        ) : null}
        {loading ? (
          <TableListPageSkeleton showWelcome={false} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No applicants yet"
            description="Applicants will appear here when students apply."
          />
        ) : (
          <>
            <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Input label="Search" placeholder="Name, university, major…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter((e.target.value as "" | ApplicationStatus) || "")}
                  options={[
                    { value: "", label: "All statuses" },
                    { value: "pending", label: "Pending" },
                    { value: "accepted", label: "Accepted" },
                    { value: "rejected", label: "Rejected" },
                    { value: "completed", label: "Completed" },
                  ]}
                />
                <Select
                  label="CV"
                  value={hasCvFilter}
                  onChange={(e) => setHasCvFilter((e.target.value as "" | "yes" | "no") || "")}
                  options={[
                    { value: "", label: "All" },
                    { value: "yes", label: "Has CV" },
                    { value: "no", label: "No CV" },
                  ]}
                />
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                      setHasCvFilter("");
                    }}
                    className="w-full"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-300">
                Showing <span className="font-semibold">{visibleRows.length}</span> of{" "}
                <span className="font-semibold">{rows.length}</span>
              </p>
            </section>

            {visibleRows.length === 0 ? (
              <EmptyState title="No matching applicants" description="Try clearing filters or changing your search query." />
            ) : (
              <Table headers={["Student name", "University / dept / major / year", "Skills", "Status", "CV", "Actions"]}>
                {visibleRows.map((app) => (
              <tr key={app.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{app.student_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{`${app.university} / ${app.department} / ${app.major} / ${app.year}`}</td>
                <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                  {app.technical_skills.length ? app.technical_skills.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-sm capitalize">
                  <ApplicationStatusBadge
                    status={app.status}
                    label={app.status.charAt(0).toUpperCase() + app.status.slice(1).replace(/_/g, " ")}
                  />
                </td>
                <td className="px-4 py-3 text-sm">
                  {app.cv_path?.trim() ? (
                    <Button
                      variant="secondary"
                      disabled={cvOpeningId === app.id}
                      onClick={() => void handleOpenApplicantCv(app.id)}
                    >
                      {cvOpeningId === app.id ? "Opening..." : "Open CV"}
                    </Button>
                  ) : (
                    <span className="text-gray-500 transition-colors duration-300 dark:text-slate-400">No CV uploaded</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {app.status === "pending" && (
                      <>
                        <Button
                          variant="primary"
                          onClick={() => updateStatus(app.id, "accepted")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Updating..." : "Accept"}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => updateStatus(app.id, "rejected")}
                          disabled={actionLoading}
                        >
                          {actionLoading ? "Updating..." : "Reject"}
                        </Button>
                      </>
                    )}
                    {app.status === COMMITMENT_PENDING_STATUS && (
                      <Button
                        variant="danger"
                        onClick={() => updateStatus(app.id, "rejected")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Updating..." : "Withdraw offer"}
                      </Button>
                    )}
                    {app.status === "accepted" && (
                      <Button
                        variant="secondary"
                        onClick={() => updateStatus(app.id, "completed")}
                        disabled={actionLoading}
                      >
                        {actionLoading ? "Updating..." : "Mark as completed"}
                      </Button>
                    )}
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
          </>
        )}

        <Modal
          isOpen={detailOpen}
          onClose={() => setDetailOpen(false)}
          title="Applicant detail"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDetailOpen(false)} disabled={actionLoading}>Close</Button>
              {selected?.status === "pending" && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => selected && updateStatus(selected.id, "rejected")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Updating..." : "Reject"}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => selected && updateStatus(selected.id, "accepted")}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Updating..." : "Accept"}
                  </Button>
                </>
              )}
              {selected?.status === COMMITMENT_PENDING_STATUS && (
                <Button
                  variant="danger"
                  onClick={() => selected && updateStatus(selected.id, "rejected")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Withdraw offer"}
                </Button>
              )}
              {selected?.status === "accepted" && (
                <Button
                  variant="secondary"
                  onClick={() => selected && updateStatus(selected.id, "completed")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Mark as completed"}
                </Button>
              )}
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
              <p><span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">Department:</span> {selected.department}</p>
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
              <p className="flex flex-wrap items-center gap-2 sm:col-span-2">
                <span className="font-medium text-gray-900 transition-colors duration-300 dark:text-white">CV:</span>{" "}
                {selected.cv_path?.trim() ? (
                  <Button
                    variant="secondary"
                    disabled={cvOpeningId === selected.id}
                    onClick={() => void handleOpenApplicantCv(selected.id)}
                  >
                    {cvOpeningId === selected.id ? "Opening..." : "Open CV"}
                  </Button>
                ) : (
                  <span className="text-gray-500 transition-colors duration-300 dark:text-slate-400">No CV uploaded</span>
                )}
              </p>
            </div>
          )}
        </Modal>
      </Container>
    </main>
  );
}
