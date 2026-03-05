"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Table from "@/components/common/Table";

type Row = { id: string; status: string; created_at: string; internship_title?: string; student_name?: string };

export default function CompanyDashboardContent() {
  const [internshipCount, setInternshipCount] = useState(0);
  const [applicationCount, setApplicationCount] = useState(0);
  const [recentApplicants, setRecentApplicants] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      supabase
        .from("internships")
        .select("id", { count: "exact", head: true })
        .eq("company_id", user.id)
        .then(({ count }) => setInternshipCount(count ?? 0));

      supabase
        .from("internships")
        .select("id")
        .eq("company_id", user.id)
        .then(({ data: internships }) => {
          const ids = (internships ?? []).map((i) => i.id);
          if (ids.length === 0) {
            setApplicationCount(0);
            setRecentApplicants([]);
            setLoading(false);
            return;
          }
          supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("internship_id", ids)
            .then(({ count }) => setApplicationCount(count ?? 0));

          supabase
            .from("applications")
            .select(`
              id,
              status,
              created_at,
              internship:internships(title),
              student:profiles!student_id(full_name)
            `)
            .in("internship_id", ids)
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data }) => {
              const rows = (data ?? []).map((row: Record<string, unknown>) => ({
                id: row.id,
                status: row.status,
                created_at: row.created_at,
                internship_title: (row.internship as { title?: string } | null)?.title,
                student_name: (row.student as { full_name?: string } | null)?.full_name,
              })) as Row[];
              setRecentApplicants(rows);
            })
            .then(() => setLoading(false), () => setLoading(false));
        });
    });
  }, []);

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active internships</p>
          <p className="text-2xl font-bold text-gray-900">{internshipCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total applications received</p>
          <p className="text-2xl font-bold text-gray-900">{applicationCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total listings</p>
          <p className="text-2xl font-bold text-gray-900">{internshipCount}</p>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent applicants</h2>
        {recentApplicants.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No applicants yet.</p>
        ) : (
          <Table headers={["Student", "Internship", "Applied", "Status"]} className="mt-4">
            {recentApplicants.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{a.student_name ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{a.internship_title ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600">{String(a.status).replace("_", " ")}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}
