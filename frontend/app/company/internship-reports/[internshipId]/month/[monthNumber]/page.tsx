"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  EmployerEvaluationForm,
  emptyEvalState,
  type EvalState,
} from "@/components/internship-reports/EmployerEvaluationForm";
import { SignaturePad } from "@/components/internship-reports/SignaturePad";
import { Button, EmptyState, ReportsPageSkeleton } from "@/components/ui";
import { computeAttendancePercentage, filterAttendanceForMonth } from "@/lib/internship-reports/helpers";
import type { AttendanceRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

function draftKey(reportId: string) {
  return `employer-eval-draft-${reportId}`;
}

export default function CompanyMonthlyEvaluationPage() {
  const params = useParams();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const monthNumber = Number(params.monthNumber);
  const [report, setReport] = useState<MonthlyReportRow | null>(null);
  const [evalState, setEvalState] = useState<EvalState>(emptyEvalState);
  const [attPct, setAttPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
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
      if (r) {
        const { data: att } = await supabase.from("internship_attendance").select("*").eq("internship_id", internshipId);
        const monthAtt = filterAttendanceForMonth((att ?? []) as AttendanceRow[], r.period_start, r.period_end);
        setAttPct(computeAttendancePercentage(monthAtt));

        const { data: existing } = await supabase
          .from("internship_employer_evaluations")
          .select("*")
          .eq("monthly_report_id", r.id)
          .maybeSingle();
        if (existing) {
          setEvalState({
            relations_with_others: existing.relations_with_others ?? "",
            ability_to_learn: existing.ability_to_learn ?? "",
            dependability: existing.dependability ?? "",
            overall_performance: existing.overall_performance ?? "",
            work_ethics: existing.work_ethics ?? "",
            attitudes: existing.attitudes ?? "",
            quality_of_work: existing.quality_of_work ?? "",
            attendance_record: existing.attendance_record ?? "",
            advancement_traits: existing.advancement_traits ?? "",
            additional_remarks: existing.additional_remarks ?? "",
            evaluator_name: existing.evaluator_name ?? "",
          });
        } else {
          try {
            const raw = localStorage.getItem(draftKey(r.id));
            if (raw) setEvalState(JSON.parse(raw) as EvalState);
          } catch {
            /* ignore */
          }
        }
      }
      setLoading(false);
    };
    void load();
  }, [internshipId, monthNumber]);

  useEffect(() => {
    document.title = `Month ${monthNumber} Evaluation — InternConnect`;
  }, [monthNumber]);

  useEffect(() => {
    if (!report) return;
    try {
      localStorage.setItem(draftKey(report.id), JSON.stringify(evalState));
    } catch {
      /* ignore */
    }
  }, [evalState, report]);

  const saveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
  };

  const submit = async () => {
    if (!report) return;
    const required = [
      evalState.relations_with_others,
      evalState.ability_to_learn,
      evalState.dependability,
      evalState.overall_performance,
      evalState.work_ethics,
      evalState.attitudes,
      evalState.quality_of_work,
      evalState.attendance_record,
    ];
    if (required.some((v) => !v)) {
      setError("All evaluation categories are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insErr } = await supabase.from("internship_employer_evaluations").upsert(
      {
        monthly_report_id: report.id,
        ...evalState,
        advancement_traits: evalState.advancement_traits || null,
        additional_remarks: evalState.additional_remarks || null,
        evaluator_name: evalState.evaluator_name || null,
      },
      { onConflict: "monthly_report_id" }
    );
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    const now = new Date().toISOString();
    await supabase
      .from("internship_monthly_reports")
      .update({
        status: "pending_supervisor",
        employer_submission_date: now,
        updated_at: now,
      })
      .eq("id", report.id);

    const { data: i } = await supabase
      .from("internships")
      .select("student_id, students(user_id, department)")
      .eq("id", internshipId)
      .maybeSingle();
    const studentUserId = (i?.students as { user_id?: string; department?: string } | null)?.user_id;
    const dept = (i?.students as { department?: string } | null)?.department;

    if (studentUserId) {
      await supabase.from("notifications").insert({
        user_id: studentUserId,
        title: "Employer evaluation submitted",
        message: `Month ${monthNumber} report is now awaiting university supervisor approval.`,
        type: "monthly_report_pending_supervisor",
        is_read: false,
        related_internship_id: internshipId,
        related_monthly_report_id: report.id,
      });
    }

    if (dept) {
      const { data: supervisors } = await supabase.from("supervisors").select("user_id").eq("department", dept);
      for (const s of supervisors ?? []) {
        await supabase.from("notifications").insert({
          user_id: s.user_id,
          title: "Monthly report pending approval",
          message: `Month ${monthNumber} report ready for supervisor review.`,
          type: "monthly_report_pending_supervisor",
          is_read: false,
          related_internship_id: internshipId,
          related_monthly_report_id: report.id,
        });
      }
    }

    try {
      localStorage.removeItem(draftKey(report.id));
    } catch {
      /* ignore */
    }

    setSaving(false);
    setSubmitted(true);
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
          <EmptyState
            title="Report not found"
            description="This monthly report does not exist or you do not have access to it."
            actionLabel="Back to reports"
            actionHref="/company/internship-reports"
          />
        </Container>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="py-8">
        <Container>
          <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center dark:border-green-900/40 dark:bg-green-950/20">
            <p className="text-2xl" aria-hidden>✅</p>
            <h2 className="mt-2 text-lg font-semibold text-green-900 dark:text-green-200">Evaluation submitted</h2>
            <p className="mt-2 text-sm text-green-800 dark:text-green-300">
              Sent to university supervisor — student notified.
            </p>
            <Link href={`/company/internship-reports/${internshipId}/evaluations`} className="mt-6 inline-block">
              <Button variant="primary">Back to evaluations</Button>
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  const canEdit = report.status === "pending_employer" || report.status === "overdue";

  return (
    <main className="py-8">
      <Container>
        <PageHeader title={`Month ${monthNumber} — Employer Evaluation`} description="Complete Part II of the JUST monthly form." />
        <Link href={`/company/internship-reports/${internshipId}/evaluations`} className="text-sm text-purple-600 hover:underline">
          ← Back
        </Link>
        <div className="mt-6">
          <EmployerEvaluationForm value={evalState} onChange={setEvalState} disabled={!canEdit} attendancePct={attPct} />
        </div>
        {canEdit && (
          <div className="mt-6">
            <SignaturePad onSave={saveSignature} />
          </div>
        )}
        <div aria-live="polite" className="mt-4 min-h-[1.25rem]">
          {draftSaved && <p className="text-sm text-green-600">Draft saved locally.</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        {canEdit && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={saveDraft}>
              Save draft
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void submit()}>
              Submit evaluation to supervisor
            </Button>
          </div>
        )}
      </Container>
    </main>
  );
}
