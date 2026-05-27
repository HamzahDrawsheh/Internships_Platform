"use client";

import { useCallback, useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsPageSkeleton } from "@/components/loading";
import { EmptyState, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";

type Row = {
  id: string;
  student: string;
  company: string;
  status: string;
  months: number;
  approved: number;
};

export default function AdminInternshipReportsPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: internships, error: internshipsError } = await supabase
      .from("internships")
      .select("id, student_id, company_id, status")
      .order("created_at", { ascending: false });

    if (internshipsError) {
      console.error("admin internship reports query error:", internshipsError);
      setError("Unable to load internship reports.");
      setLoading(false);
      return;
    }

    const safeInternships = internships ?? [];
    if (safeInternships.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const studentIds = [...new Set(safeInternships.map((i) => i.student_id))];
    const companyIds = [...new Set(safeInternships.map((i) => i.company_id))];
    const internshipIds = safeInternships.map((i) => i.id);

    const [{ data: students }, { data: companies }, { data: reports }] = await Promise.all([
      supabase.from("students").select("id, user_id").in("id", studentIds),
      supabase.from("companies").select("id, company_name").in("id", companyIds),
      supabase.from("internship_monthly_reports").select("internship_id, status").in("internship_id", internshipIds),
    ]);

    const userIds = [...new Set((students ?? []).map((s) => s.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };

    const studentById = new Map((students ?? []).map((s) => [s.id, s]));
    const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const companyById = new Map((companies ?? []).map((c) => [c.id, c.company_name?.trim() || "—"]));

    const reportsByInternship = new Map<string, { total: number; approved: number }>();
    for (const report of reports ?? []) {
      const current = reportsByInternship.get(report.internship_id) ?? { total: 0, approved: 0 };
      current.total += 1;
      if (report.status === "approved") current.approved += 1;
      reportsByInternship.set(report.internship_id, current);
    }

    setRows(
      safeInternships.map((i) => {
        const student = studentById.get(i.student_id);
        const profile = student ? profileByUserId.get(student.user_id) : null;
        const stats = reportsByInternship.get(i.id) ?? { total: 0, approved: 0 };
        return {
          id: i.id,
          student: profile?.full_name?.trim() || "—",
          company: companyById.get(i.company_id) ?? "—",
          status: i.status,
          months: stats.total,
          approved: stats.approved,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessLoading && isAdmin) {
      void Promise.resolve().then(loadReports);
    }
  }, [accessLoading, isAdmin, loadReports]);

  if (accessLoading) {
    return (
      <main className="py-8">
        <Container>
          <ReportsPageSkeleton />
        </Container>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="py-8">
        <Container>
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {accessError ?? "Access denied."}
          </p>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader title="Internship reports overview" description="Platform-wide monthly report tracking." />
        {loading ? <ReportsPageSkeleton /> : null}
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {!loading && !error && !rows.length && (
          <EmptyState title="No internship tracking records" description="Records appear when companies accept students." />
        )}
        {!loading && rows.length > 0 && (
          <Table
            headers={["Student", "Company", "Status", "Months", "Approved"]}
            className="mt-6 dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
          >
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{r.student}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{r.company}</td>
                <td className="px-4 py-3 text-sm capitalize text-gray-600 dark:text-slate-400">
                  {r.status.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-slate-400">{r.months}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-slate-400">
                  {r.approved}/{r.months}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Container>
    </main>
  );
}
