"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { NextActionCard } from "@/components/internship-reports/NextActionCard";
import { ReportsPageSkeleton } from "@/components/internship-reports/ReportsPageSkeleton";
import { MonthlyReportStatusBadge } from "@/components/internship-reports/MonthlyReportStatusBadge";
import { Button, EmptyState } from "@/components/ui";
import { formatIsoDate } from "@/lib/internship-reports/helpers";
import { syncInternshipReportStatuses } from "@/lib/internship-reports/sync-status";
import { getCompanyNextAction } from "@/lib/internship-reports/workflow";
import type { InternshipRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

type TraineeRow = InternshipRow & {
  student_name: string;
  pending_evaluations: number;
  pending_attendance: boolean;
};

type PendingEval = MonthlyReportRow & { student_name: string; internship_id: string };

export default function CompanyInternshipReportsPage() {
  const [rows, setRows] = useState<TraineeRow[]>([]);
  const [pendingEvals, setPendingEvals] = useState<PendingEval[]>([]);
  const [loading, setLoading] = useState(true);

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
      const { data: company } = await supabase.from("companies").select("id").eq("user_id", user.id).maybeSingle();
      if (!company) {
        setLoading(false);
        return;
      }

      const { data: internships } = await supabase
        .from("internships")
        .select("*")
        .eq("company_id", company.id)
        .in("status", ["active", "completed", "pending_supervisor_approval"])
        .order("created_at", { ascending: false });

      const result: TraineeRow[] = [];
      const pendingList: PendingEval[] = [];
      for (const i of internships ?? []) {
        await syncInternshipReportStatuses(supabase, i.id);
        const [{ data: st }, { data: reports }] = await Promise.all([
          supabase.from("students").select("user_id").eq("id", i.student_id).maybeSingle(),
          supabase
            .from("internship_monthly_reports")
            .select("*")
            .eq("internship_id", i.id),
        ]);
        let studentName = "Student";
        if (st?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
          studentName = p?.full_name ?? studentName;
        }
        const pending = (reports ?? []).filter((r) => r.status === "pending_employer" || r.status === "overdue");
        for (const r of pending) {
          pendingList.push({ ...(r as MonthlyReportRow), student_name: studentName, internship_id: i.id });
        }
        result.push({
          ...(i as InternshipRow),
          student_name: studentName,
          pending_evaluations: pending.length,
          pending_attendance: i.status === "active",
        });
      }
      setRows(result);
      setPendingEvals(pendingList);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Trainee reports & attendance"
          description="Manage attendance, complete employer evaluations, and review monthly internship reports."
        />

        {loading && <ReportsPageSkeleton />}
        {!loading && !rows.length && (
          <EmptyState title="No trainees" description="Accepted interns appear here once internship tracking is initialized." />
        )}

        {!loading && <NextActionCard action={getCompanyNextAction(pendingEvals)} />}

        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 p-5 dark:border-gray-800"
            >
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{row.student_name}</h3>
                <p className="text-sm text-gray-500">
                  {formatIsoDate(row.start_date)} → {formatIsoDate(row.end_date)}
                </p>
                <div className="mt-2">
                  <MonthlyReportStatusBadge status={row.status === "active" ? "unlocked" : row.status} />
                  {row.pending_evaluations > 0 && (
                    <span className="ml-2 text-sm text-amber-600">{row.pending_evaluations} evaluation(s) pending</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/company/internship-reports/${row.id}/attendance`}>
                  <Button variant="secondary">Attendance</Button>
                </Link>
                <Link href={`/company/internship-reports/${row.id}/evaluations`}>
                  <Button variant="primary">Evaluations</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
