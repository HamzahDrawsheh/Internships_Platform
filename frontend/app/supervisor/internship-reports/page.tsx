"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportStatusBadge } from "@/components/internship-reports/MonthlyReportStatusBadge";
import { NextActionCard } from "@/components/internship-reports/NextActionCard";
import { ReportsPageSkeleton } from "@/components/internship-reports/ReportsPageSkeleton";
import { Button, EmptyState } from "@/components/ui";
import { formatIsoDate } from "@/lib/internship-reports/helpers";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import { getSupervisorNextAction } from "@/lib/internship-reports/workflow";
import type { InternshipRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

type PendingInternship = InternshipRow & { student_name: string; company_name: string };
type PendingReport = MonthlyReportRow & { student_name: string; company_name: string };

export default function SupervisorInternshipReportsPage() {
  const [pendingInternships, setPendingInternships] = useState<PendingInternship[]>([]);
  const [pendingReports, setPendingReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: sup } = await supabase.from("supervisors").select("department").eq("user_id", user.id).maybeSingle();
      if (!sup?.department) {
        setLoading(false);
        return;
      }

      const { data: students } = await supabase.from("students").select("id, user_id").eq("department", sup.department);
      const studentIds = (students ?? []).map((s) => s.id);
      if (!studentIds.length) {
        setLoading(false);
        return;
      }

      const { data: internships } = await supabase
        .from("internships")
        .select("*")
        .in("student_id", studentIds)
        .eq("status", "pending_supervisor_approval");

      const pendingI: PendingInternship[] = [];
      for (const i of internships ?? []) {
        const st = students?.find((s) => s.id === i.student_id);
        let studentName = "Student";
        if (st?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
          studentName = p?.full_name ?? studentName;
        }
        const { data: co } = await supabase.from("companies").select("company_name").eq("id", i.company_id).maybeSingle();
        pendingI.push({
          ...(i as InternshipRow),
          student_name: studentName,
          company_name: co?.company_name ?? "Company",
        });
      }
      setPendingInternships(pendingI);

      const { data: activeInternships } = await supabase
        .from("internships")
        .select("id, student_id, company_id")
        .in("student_id", studentIds)
        .eq("status", "active");

      const activeIds = (activeInternships ?? []).map((i) => i.id);
      const reports: PendingReport[] = [];
      for (const id of activeIds) {
        await syncInternshipReportStatuses(supabase, id);
        const { data: reps } = await supabase
          .from("internship_monthly_reports")
          .select("*")
          .eq("internship_id", id)
          .eq("status", "pending_supervisor");
        const intern = activeInternships?.find((x) => x.id === id);
        for (const r of reps ?? []) {
          const st = students?.find((s) => s.id === intern?.student_id);
          let studentName = "Student";
          if (st?.user_id) {
            const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
            studentName = p?.full_name ?? studentName;
          }
          const { data: co } = await supabase
            .from("companies")
            .select("company_name")
            .eq("id", intern?.company_id ?? "")
            .maybeSingle();
          reports.push({
            ...(r as MonthlyReportRow),
            student_name: studentName,
            company_name: co?.company_name ?? "Company",
          });
        }
      }
      setPendingReports(reports);
      setLoading(false);
    };
    void load();
  }, []);

  const approveInternship = async (internshipId: string) => {
    setActionId(internshipId);
    const supabase = createClient();
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", (await supabase.auth.getUser()).data.user?.id ?? "").maybeSingle();
    const { error } = await supabase.rpc("approve_internship_by_supervisor", {
      p_internship: internshipId,
      p_supervisor_name: prof?.full_name ?? null,
    });
    if (error) alert(error.message);
    else window.location.reload();
    setActionId(null);
  };

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Internship reports"
          description="Approve internship tracking and review monthly report submissions."
        />

        {loading && <ReportsPageSkeleton />}

        {!loading && (
          <NextActionCard
            action={getSupervisorNextAction(
              pendingReports.map((r) => ({ ...r, internship_id: r.internship_id }))
            )}
          />
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Pending internship approvals</h2>
          {!pendingInternships.length && !loading && (
            <p className="mt-2 text-sm text-gray-500">No internships awaiting approval.</p>
          )}
          <div className="mt-4 space-y-3">
            {pendingInternships.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div>
                  <p className="font-medium">{i.student_name}</p>
                  <p className="text-sm text-gray-600">{i.company_name} · {formatIsoDate(i.start_date)} → {formatIsoDate(i.end_date)}</p>
                </div>
                <Button
                  variant="primary"
                  disabled={actionId === i.id}
                  onClick={() => void approveInternship(i.id)}
                >
                  Approve tracking
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Monthly reports pending approval</h2>
          {!pendingReports.length && !loading && (
            <EmptyState title="All caught up" description="No monthly reports waiting for your review." />
          )}
          <div className="mt-4 space-y-3">
            {pendingReports.map((r) => (
              <Link
                key={r.id}
                href={`/supervisor/internship-reports/${r.internship_id}/month/${r.month_number}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:border-purple-300 dark:border-gray-800"
              >
                <div>
                  <p className="font-medium">{r.student_name} — Month {r.month_number}</p>
                  <p className="text-sm text-gray-500">{r.company_name}</p>
                </div>
                <MonthlyReportStatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
