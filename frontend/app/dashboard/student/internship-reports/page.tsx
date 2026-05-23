"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternshipProgressCard } from "@/components/internship-reports/InternshipProgressCard";
import { MonthTimeline } from "@/components/internship-reports/MonthTimeline";
import { NextActionCard } from "@/components/internship-reports/NextActionCard";
import { ReportEmptyState } from "@/components/internship-reports/ReportEmptyState";
import { ReportsPageSkeleton } from "@/components/internship-reports/ReportsPageSkeleton";
import { Button } from "@/components/ui";
import { syncInternshipReportStatuses, ensureStudentInternshipTracking, repairInternshipTracking } from "@/lib/internship-reports/sync-status";
import { getStudentNextAction } from "@/lib/internship-reports/workflow";
import type { InternshipRow, MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

type InternshipBundle = InternshipRow & {
  company_name: string;
  position_title: string;
  reports: MonthlyReportRow[];
};

export default function StudentInternshipReportsPage() {
  const [items, setItems] = useState<InternshipBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setSyncError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Please sign in.");
      setLoading(false);
      return;
    }

    const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
    if (!student) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      await ensureStudentInternshipTracking(supabase);
    } catch {
      setSyncError("Could not sync internship tracking.");
    }

    const { data: internships, error: iErr } = await supabase
      .from("internships")
      .select("*")
      .eq("student_id", student.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (iErr) {
      setError(iErr.message);
      setLoading(false);
      return;
    }

    const bundles: InternshipBundle[] = [];
    for (const i of internships ?? []) {
      try {
        await repairInternshipTracking(supabase, i.id);
        await syncInternshipReportStatuses(supabase, i.id);
      } catch {
        setSyncError("Some reports may be out of date.");
      }
      const [{ data: reports }, { data: app }] = await Promise.all([
        supabase
          .from("internship_monthly_reports")
          .select("*")
          .eq("internship_id", i.id)
          .order("month_number"),
        supabase
          .from("applications")
          .select("position_id, internship_positions(title, companies(company_name))")
          .eq("id", i.application_id)
          .maybeSingle(),
      ]);
      const pos = app?.internship_positions as { title?: string; companies?: { company_name?: string } } | null;
      bundles.push({
        ...(i as InternshipRow),
        company_name: pos?.companies?.company_name ?? "Company",
        position_title: pos?.title ?? "Internship",
        reports: (reports ?? []) as MonthlyReportRow[],
      });
    }
    setItems(bundles);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const primary = items[0];
  const nextAction = primary ? getStudentNextAction(primary.reports, primary.id, primary.status) : null;

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Monthly internship reports"
          description="Submit JUST monthly evaluation forms, track attendance, and upload your final report when complete."
        />

        {loading && <ReportsPageSkeleton />}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {syncError && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
            <span className="text-amber-900 dark:text-amber-200">{syncError}</span>
            <Button variant="secondary" onClick={() => void load()}>
              Retry sync
            </Button>
          </div>
        )}

        {!loading && !items.length && <ReportEmptyState />}

        {!loading && primary && (
          <div className="mt-6 space-y-6">
            <NextActionCard action={nextAction} />

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{primary.position_title}</h2>
                  <p className="text-sm text-gray-500">{primary.company_name}</p>
                </div>
                <Link href={`/dashboard/student/internship-reports/${primary.id}`}>
                  <Button variant="secondary">Final report & details</Button>
                </Link>
              </div>

              {primary.status === "pending_supervisor_approval" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  Waiting for your university supervisor to approve internship tracking before monthly reports unlock.
                </div>
              )}

              {primary.reports.length > 0 && (
                <InternshipProgressCard
                  reports={primary.reports}
                  startDate={primary.start_date}
                  endDate={primary.end_date}
                  internshipStatus={primary.status}
                />
              )}

              {primary.reports.length > 0 ? (
                <MonthTimeline
                  reports={primary.reports}
                  internshipId={primary.id}
                  role="student"
                  basePath="/dashboard/student/internship-reports"
                />
              ) : primary.status !== "pending_supervisor_approval" ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200">
                  Monthly reports are being prepared.{" "}
                  <button type="button" className="font-medium underline" onClick={() => void load()}>
                    Refresh
                  </button>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </Container>
    </main>
  );
}
