"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, Table } from "@/components/ui";
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
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: internships } = await supabase.from("internships").select("*").order("created_at", { ascending: false });
      const result: Row[] = [];
      for (const i of internships ?? []) {
        const [{ data: st }, { data: co }, { data: reps }] = await Promise.all([
          supabase.from("students").select("user_id").eq("id", i.student_id).maybeSingle(),
          supabase.from("companies").select("company_name").eq("id", i.company_id).maybeSingle(),
          supabase.from("internship_monthly_reports").select("status").eq("internship_id", i.id),
        ]);
        let student = "—";
        if (st?.user_id) {
          const { data: p } = await supabase.from("profiles").select("full_name").eq("id", st.user_id).maybeSingle();
          student = p?.full_name ?? student;
        }
        const approved = (reps ?? []).filter((r) => r.status === "approved").length;
        result.push({
          id: i.id,
          student,
          company: co?.company_name ?? "—",
          status: i.status,
          months: (reps ?? []).length,
          approved,
        });
      }
      setRows(result);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <main className="py-8">
      <Container>
        <PageHeader title="Internship reports overview" description="Platform-wide monthly report tracking." />
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && !rows.length && (
          <EmptyState title="No internship tracking records" description="Records appear when companies accept students." />
        )}
        {rows.length > 0 && (
          <Table headers={["Student", "Company", "Status", "Months", "Approved"]} className="mt-6">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-sm">{r.student}</td>
                <td className="px-4 py-3 text-sm">{r.company}</td>
                <td className="px-4 py-3 text-sm capitalize">{r.status.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-sm">{r.months}</td>
                <td className="px-4 py-3 text-sm">{r.approved}/{r.months}</td>
              </tr>
            ))}
          </Table>
        )}
      </Container>
    </main>
  );
}
