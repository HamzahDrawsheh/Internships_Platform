"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Table } from "@/components/ui";
import ApplicationStatusBadge from "@/components/applications/ApplicationStatusBadge";
import { StatCard, EmptyState, Button } from "@/components/ui";

type ApplicantRow = {
  id: string;
  status: string;
  created_at: string;
  internship_title?: string;
  student_name?: string;
};

export default function CompanyDashboardContent() {
  const [activeInternships, setActiveInternships] = useState(0);
  const [applicantCount, setApplicantCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setLoading(false);
        return;
      }
      // Active internships count (status = 'active')
      supabase
        .from("internships")
        .select("id", { count: "exact", head: true })
        .eq("company_id", user.id)
        .eq("status", "active")
        .then(({ count }) => setActiveInternships(count ?? 0));

      supabase
        .from("internships")
        .select("id")
        .eq("company_id", user.id)
        .then(({ data: internships }) => {
          const ids = (internships ?? []).map((i) => i.id);
          if (ids.length === 0) {
            setApplicantCount(0);
            setAcceptedCount(0);
            setApplicants([]);
            setLoading(false);
            return;
          }
          // Total applicants
          supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("internship_id", ids)
            .then(({ count }) => setApplicantCount(count ?? 0));
          // Accepted students count
          supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .in("internship_id", ids)
            .eq("status", "accepted")
            .then(({ count }) => setAcceptedCount(count ?? 0));
          // Recent applicants for table
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
            .limit(10)
            .then(({ data }) => {
              const rows = (data ?? []).map((row: Record<string, unknown>) => ({
                id: row.id,
                status: row.status,
                created_at: row.created_at,
                internship_title: (row.internship as { title?: string } | null)?.title,
                student_name: (row.student as { full_name?: string } | null)?.full_name,
              })) as ApplicantRow[];
              setApplicants(rows);
            })
            .then(() => setLoading(false), () => setLoading(false));
        });
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-gray-200 bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active internships" value={activeInternships} />
        <StatCard label="Applicants" value={applicantCount} />
        <StatCard label="Accepted students" value={acceptedCount} />
      </div>

      {/* Table */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent applicants</h2>
              <p className="text-sm text-gray-500">Students who applied to your internships.</p>
            </div>
            <Link href="/company/internships">
              <Button variant="secondary">Manage internships</Button>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          {applicants.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No applicants yet"
                description="Create internships to start receiving applications."
                actionLabel="Create internship"
                actionHref="/company/internships/new"
              />
            </div>
          ) : (
            <Table headers={["Student", "Internship", "Applied", "Status"]} className="min-w-full">
              {applicants.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {a.student_name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {a.internship_title ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <ApplicationStatusBadge status={a.status as "submitted" | "under_review" | "accepted" | "rejected"} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
