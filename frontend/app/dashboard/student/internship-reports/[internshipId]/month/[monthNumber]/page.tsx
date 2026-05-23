"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportStatusBadge } from "@/components/internship-reports/MonthlyReportStatusBadge";
import { ReportsPageSkeleton } from "@/components/internship-reports/ReportsPageSkeleton";
import { StudentMonthlyWizard } from "@/components/internship-reports/StudentMonthlyWizard";
import type { BasicInfoValues } from "@/components/internship-reports/JustFormHeader";
import { canStudentSubmitReport } from "@/lib/internship-reports/helpers";
import { ensureMonthlyReportWeeklySlots, repairInternshipTracking, syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import type { AttendanceRow, InternshipRow, MonthlyReportRow, WeeklyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

export default function StudentMonthlyReportFormPage() {
  const params = useParams();
  const router = useRouter();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const monthNumber = Number(params.monthNumber);

  const [internship, setInternship] = useState<InternshipRow | null>(null);
  const [report, setReport] = useState<MonthlyReportRow | null>(null);
  const [allReports, setAllReports] = useState<MonthlyReportRow[]>([]);
  const [weeks, setWeeks] = useState<WeeklyReportRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [assignments, setAssignments] = useState("");
  const [workSummary, setWorkSummary] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!internshipId || !monthNumber) return;
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: prof }, { data: st }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("students").select("id, department").eq("user_id", user.id).maybeSingle(),
      ]);
      setStudentName(prof?.full_name ?? "");
      setStudentId(st?.id?.slice(0, 8).toUpperCase() ?? user.id.slice(0, 8).toUpperCase());
      setDepartment(st?.department ?? "");

      await repairInternshipTracking(supabase, internshipId);
      await syncInternshipReportStatuses(supabase, internshipId);

      const { data: i } = await supabase.from("internships").select("*").eq("id", internshipId).maybeSingle();
      setInternship(i as InternshipRow | null);

      let defaultEmployer = i?.employer_supervisor_name ?? "";
      if (i?.company_id) {
        const { data: co } = await supabase.from("companies").select("company_name").eq("id", i.company_id).maybeSingle();
        if (co?.company_name) defaultEmployer = co.company_name;
      }

      const { data: reps } = await supabase
        .from("internship_monthly_reports")
        .select("*")
        .eq("internship_id", internshipId)
        .order("month_number");
      setAllReports((reps ?? []) as MonthlyReportRow[]);
      const r = (reps ?? []).find((x) => x.month_number === monthNumber) as MonthlyReportRow | undefined;
      setReport(r ?? null);
      if (r) {
        setStudentName(r.form_student_name ?? prof?.full_name ?? "");
        setStudentId(r.form_student_id ?? st?.id?.slice(0, 8).toUpperCase() ?? user.id.slice(0, 8).toUpperCase());
        setDepartment(r.form_department ?? st?.department ?? "");
        setEmployerName(r.form_employer_name ?? defaultEmployer);
        setSupervisorName(r.form_university_supervisor ?? i?.university_supervisor_name ?? "");
        setAssignments(r.assignments ?? "");
        setWorkSummary(r.work_summary ?? "");
        await ensureMonthlyReportWeeklySlots(supabase, r.id);
        const [{ data: wks }, { data: att }] = await Promise.all([
          supabase.from("internship_weekly_reports").select("*").eq("monthly_report_id", r.id).order("week_number"),
          supabase.from("internship_attendance").select("*").eq("internship_id", internshipId).order("date"),
        ]);
        setWeeks((wks ?? []) as WeeklyReportRow[]);
        setAttendance((att ?? []) as AttendanceRow[]);
      } else {
        setSupervisorName(i?.university_supervisor_name ?? "");
        setEmployerName(defaultEmployer);
      }
      setLoading(false);
    };
    void load();
  }, [internshipId, monthNumber]);

  const canSubmit = report && canStudentSubmitReport(report, allReports);

  const handleBasicInfoChange = (field: keyof BasicInfoValues, value: string) => {
    switch (field) {
      case "studentName":
        setStudentName(value);
        break;
      case "studentId":
        setStudentId(value);
        break;
      case "department":
        setDepartment(value);
        break;
      case "employerName":
        setEmployerName(value);
        break;
      case "universitySupervisor":
        setSupervisorName(value);
        break;
    }
  };

  const persistDraft = async () => {
    if (!report) return;
    const supabase = createClient();
    await supabase
      .from("internship_monthly_reports")
      .update({
        assignments,
        work_summary: workSummary,
        form_student_name: studentName.trim() || null,
        form_student_id: studentId.trim() || null,
        form_department: department.trim() || null,
        form_employer_name: employerName.trim() || null,
        form_university_supervisor: supervisorName.trim() || null,
        status: "pending_student",
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id);
    for (const w of weeks) {
      await supabase.from("internship_weekly_reports").update({ description: w.description }).eq("id", w.id);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    await persistDraft();
    setSaveMessage("Draft saved.");
    setTimeout(() => setSaveMessage(null), 3000);
    setSaving(false);
  };

  const submitToEmployer = async () => {
    if (!report || !canSubmit) return;
    if (!assignments.trim() || !workSummary.trim()) {
      setError("Assignments and work summary are required.");
      return;
    }
    if (!studentName.trim() || !studentId.trim() || !department.trim() || !employerName.trim()) {
      setError("Please complete all basic info fields (name, ID, department, employer).");
      return;
    }
    if (weeks.some((w) => !w.description.trim())) {
      setError("Please complete all weekly descriptions.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    await persistDraft();
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("internship_monthly_reports")
      .update({
        status: "pending_employer",
        student_submission_date: now,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", report.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    const { data: company } = await supabase
      .from("internships")
      .select("company_id, companies(user_id)")
      .eq("id", internshipId)
      .maybeSingle();
    const companyUserId = (company?.companies as { user_id?: string } | null)?.user_id;
    if (companyUserId) {
      await supabase.from("notifications").insert({
        user_id: companyUserId,
        title: "Monthly report awaiting evaluation",
        message: `Month ${monthNumber} internship report submitted. Please complete employer evaluation.`,
        type: "monthly_report_pending_employer",
        is_read: false,
        related_internship_id: internshipId,
        related_monthly_report_id: report.id,
      });
    }
    setSaving(false);
    router.push("/dashboard/student/internship-reports");
  };

  const saveSignature = async (dataUrl: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_signatures").upsert(
      { user_id: user.id, signature_data_url: dataUrl, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  };

  if (loading) {
    return (
      <main className="py-8">
        <Container><ReportsPageSkeleton /></Container>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="py-8">
        <Container>
          <PageHeader title={`Month ${monthNumber}`} description="Monthly report not found." />
          <Link href="/dashboard/student/internship-reports" className="text-sm text-purple-600 hover:underline">
            ← Back to reports
          </Link>
          <p className="mt-4 text-sm text-gray-600">
            Reports are still syncing. Go back and refresh the list, or wait a moment and reload this page.
          </p>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title={`Month ${monthNumber} — Student Report (Part I)`}
          description={`${report.period_start} to ${report.period_end}`}
        />
        <Link href="/dashboard/student/internship-reports" className="text-sm text-purple-600 hover:underline">
          ← Back
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MonthlyReportStatusBadge status={report.status} />
          {report.rejection_reason && (
            <p className="text-sm text-red-600">Revision requested: {report.rejection_reason}</p>
          )}
        </div>

        <div className="mt-6">
          <StudentMonthlyWizard
            report={report}
            studentName={studentName}
            studentId={studentId}
            department={department}
            employerName={employerName}
            supervisorName={supervisorName}
            assignments={assignments}
            workSummary={workSummary}
            weeks={weeks}
            attendance={attendance}
            canSubmit={Boolean(canSubmit)}
            saving={saving}
            error={error}
            saveMessage={saveMessage}
            onAssignmentsChange={setAssignments}
            onWorkSummaryChange={setWorkSummary}
            onBasicInfoChange={handleBasicInfoChange}
            onWeeksChange={setWeeks}
            onSaveDraft={() => void saveDraft()}
            onSubmit={() => void submitToEmployer()}
            onSaveSignature={saveSignature}
          />
        </div>
      </Container>
    </main>
  );
}
