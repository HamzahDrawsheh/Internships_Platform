"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthlyReportStatusBadge } from "@/components/internship-reports/MonthlyReportStatusBadge";
import type { MonthlyReportRow } from "@/lib/internship-reports/types";
import { createClient } from "@/lib/supabase/client";

export default function CompanyEvaluationsListPage() {
  const params = useParams();
  const internshipId = typeof params.internshipId === "string" ? params.internshipId : "";
  const [pending, setPending] = useState<MonthlyReportRow[]>([]);

  useEffect(() => {
    if (!internshipId) return;
    const supabase = createClient();
    void supabase
      .from("internship_monthly_reports")
      .select("*")
      .eq("internship_id", internshipId)
      .in("status", ["pending_employer", "overdue"])
      .order("month_number")
      .then(({ data }) => setPending((data ?? []) as MonthlyReportRow[]));
  }, [internshipId]);

  return (
    <main className="py-8">
      <Container>
        <PageHeader title="Pending employer evaluations" description="Complete Part II for submitted monthly reports." />
        <Link href="/company/internship-reports" className="text-sm text-purple-600 hover:underline">← Back</Link>
        <div className="mt-6 space-y-3">
          {pending.map((r) => (
            <Link
              key={r.id}
              href={`/company/internship-reports/${internshipId}/month/${r.month_number}`}
              className="flex items-center justify-between rounded-xl border border-gray-200 p-4 hover:border-purple-300 dark:border-gray-800"
            >
              <span className="font-medium">Month {r.month_number}</span>
              <MonthlyReportStatusBadge status={r.status} />
            </Link>
          ))}
          {!pending.length && <p className="text-sm text-gray-500">No evaluations pending.</p>}
        </div>
      </Container>
    </main>
  );
}
