"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendancePreview } from "@/components/internship-reports/AttendancePreview";
import { EmployerEvaluationReadOnly } from "@/components/internship-reports/EmployerEvaluationReadOnly";
import { MonthlyReportStatusBadge } from "@/components/internship-reports/MonthlyReportStatusBadge";
import { Button, EmptyState, Textarea, ReportsPageSkeleton } from "@/components/ui";
import { computeAttendancePercentage, filterAttendanceForMonth, formatIsoDate } from "@/lib/internship-reports/helpers";
import type { AttendanceRow, EmployerEvaluationRow, MonthlyReportRow, WeeklyReportRow } from "@/lib/internship-reports/types";
import { AIExtractedSkills } from "@/components/student/AIExtractedSkills";
import { createClient } from "@/lib/supabase/client";

const COMMENT_CHIPS = [
  "Add more detail in Week 3",
  "Fix attendance discrepancy",
  "Expand work summary",
  "Clarify assignments",
];

export default function SupervisorMonthlyReviewPage() {
  const params = useParams();
  const router = useRouter();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const monthNumber = Number(params.monthNumber);
  const [report, setReport] = useState<MonthlyReportRow | null>(null);
  const [weeks, setWeeks] = useState<WeeklyReportRow[]>([]);
  const [employerEval, setEmployerEval] = useState<EmployerEvaluationRow | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [studentName, setStudentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!internshipId || !monthNumber) return;
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      const { data: r } = await supabase
        .from("internship_monthly_reports")
        .select("*")
        .eq("internship_id", internshipId)
        .eq("month_number", monthNumber)
        .maybeSingle();
      setReport(r as MonthlyReportRow | null);
      setComments(r?.supervisor_comments ?? "");

      if (r) {
        const [{ data: wks }, { data: ev }, { data: att }] = await Promise.all([
          supabase.from("internship_weekly_reports").select("*").eq("monthly_report_id", r.id).order("week_number"),
          supabase.from("internship_employer_evaluations").select("*").eq("monthly_report_id", r.id).maybeSingle(),
          supabase.from("internship_attendance").select("*").eq("internship_id", internshipId),
        ]);
        setWeeks((wks ?? []) as WeeklyReportRow[]);
        setEmployerEval((ev ?? null) as EmployerEvaluationRow | null);
        setAttendance((att ?? []) as AttendanceRow[]);
      }

      const { data: i } = await supabase.from("internships").select("student_id").eq("id", internshipId).maybeSingle();
      if (i?.student_id) {
        const { data: st } = await supabase.from("students").select("user_id").eq("id", i.student_id).maybeSingle();
        if (st?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
          setStudentName(p?.full_name ?? "Student");
        }
      }
      setLoading(false);
    };
    void load();
  }, [internshipId, monthNumber]);

  useEffect(() => {
    document.title = `Month ${monthNumber} Review — InternConnect`;
  }, [monthNumber]);

  const monthAttendance = useMemo(
    () => (report ? filterAttendanceForMonth(attendance, report.period_start, report.period_end) : []),
    [attendance, report]
  );
  const attPct = computeAttendancePercentage(monthAttendance);

  const approve = async () => {
    if (!report) return;
    setSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("internship_monthly_reports")
      .update({
        status: "approved",
        supervisor_approval_date: now,
        supervisor_comments: comments || null,
        rejection_reason: null,
        updated_at: now,
      })
      .eq("id", report.id);

    const { data: i } = await supabase.from("internships").select("student_id, students(user_id)").eq("id", internshipId).maybeSingle();
    const studentUserId = (i?.students as { user_id?: string } | null)?.user_id;
    if (studentUserId) {
      await supabase.from("notifications").insert({
        user_id: studentUserId,
        title: "Monthly report approved",
        message: `Month ${monthNumber} internship report was approved by your supervisor.`,
        type: "monthly_report_approved",
        is_read: false,
        related_internship_id: internshipId,
        related_monthly_report_id: report.id,
      });
    }

    await fetch(`/api/internship-reports/${report.id}/pdf`);
    setSaving(false);
    setActionMessage("Report approved.");
    router.push("/supervisor/internship-reports");
  };

  const reject = async () => {
    if (!report || !rejectionReason.trim()) {
      setActionMessage("Please provide a reason for rejection.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const now = new Date().toISOString();
    await supabase
      .from("internship_monthly_reports")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
        supervisor_comments: comments || null,
        updated_at: now,
      })
      .eq("id", report.id);

    const { data: i } = await supabase.from("internships").select("student_id, students(user_id)").eq("id", internshipId).maybeSingle();
    const studentUserId = (i?.students as { user_id?: string } | null)?.user_id;
    if (studentUserId) {
      await supabase.from("notifications").insert({
        user_id: studentUserId,
        title: "Monthly report needs revision",
        message: rejectionReason.trim(),
        type: "monthly_report_rejected",
        is_read: false,
        related_internship_id: internshipId,
        related_monthly_report_id: report.id,
      });
    }
    setSaving(false);
    router.push("/supervisor/internship-reports");
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
          <EmptyState
            title="Report not found"
            description="This monthly report does not exist or you do not have access to it."
            actionLabel="Back to reports"
            actionHref="/supervisor/internship-reports"
          />
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title={`Review — ${studentName} · Month ${monthNumber}`}
          description={`${formatIsoDate(report.period_start)} to ${formatIsoDate(report.period_end)}`}
        />
        <Link href="/supervisor/internship-reports" className="text-sm text-purple-600 hover:underline">
          ← Back
        </Link>

        <div className="mt-4">
          <MonthlyReportStatusBadge status={report.status} />
        </div>

        {report.status === "rejected" && report.rejection_reason && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Previous revision request</p>
            <p className="mt-1 text-amber-800 dark:text-amber-300">{report.rejection_reason}</p>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">Part I — Student</h3>
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500">Assignments</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm">{report.assignments || "—"}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500">Work summary</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm">{report.work_summary || "—"}</p>
              </div>
              {weeks.map((w) => (
                <div key={w.id}>
                  <h4 className="text-xs font-semibold text-gray-500">Week {w.week_number}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{w.description || "—"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
            <h3 className="text-sm font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
              Part II — Employer Evaluation
            </h3>
            <EmployerEvaluationReadOnly evaluation={employerEval} />
          </div>
        </div>

        <div className="mt-6">
          <AttendancePreview attendance={attendance} periodStart={report.period_start} periodEnd={report.period_end} />
          <p className="mt-1 text-xs text-gray-500">System attendance: {attPct}% for this month.</p>
        </div>

        <div className="mt-6">
          <a href={`/api/internship-reports/${report.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Preview / download PDF</Button>
          </a>
        </div>

        {(report.status === "pending_supervisor" ||
          report.status === "approved" ||
          report.status === "pending_employer") && (
          <AIExtractedSkills reportId={report.id} readOnly />
        )}

        {report.status === "pending_supervisor" && (
          <div className="mt-8 space-y-4">
            <div>
              <label className="text-sm font-semibold">Supervisor comments (optional)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COMMENT_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    onClick={() => setRejectionReason((prev) => (prev ? `${prev}; ${chip}` : chip))}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} className="mt-2" />
            </div>
            <div>
              <label className="text-sm font-semibold">Rejection reason (required to reject)</label>
              <Textarea rows={2} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" />
            </div>
            <div aria-live="polite">{actionMessage && <p className="text-sm text-amber-700">{actionMessage}</p>}</div>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary" disabled={saving} onClick={() => void approve()}>
                Approve
              </Button>
              <Button variant="secondary" disabled={saving} onClick={() => void reject()}>
                Request revision
              </Button>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
