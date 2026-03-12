"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
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
    Promise.all([
      api.get<{ id: string }>("/auth/me").catch(() => null),
      api.get<{ data: Array<{ id: string; company_id: string; status: string }> }>("/internships").catch(() => ({ data: [] })),
    ]).then(([me, internshipsRes]) => {
      const userId = me?.id;
      const all = internshipsRes?.data ?? [];
      const mine = userId ? all.filter((i) => i.company_id === userId) : [];
      const activeCount = mine.filter((i) => i.status === "active").length;
      setActiveInternships(activeCount);

      if (mine.length === 0) {
        setApplicantCount(0);
        setAcceptedCount(0);
        setApplicants([]);
        setLoading(false);
        return;
      }

      Promise.all(mine.map((i) => api.get<{ data: Array<{ id: string; status: string; created_at: string; internship_title?: string }> }>(`/internships/${i.id}/applications`).catch(() => ({ data: [] }))))
        .then((results) => {
          const allApps = results.flatMap((r) => r.data ?? []);
          setApplicantCount(allApps.length);
          setAcceptedCount(allApps.filter((a) => a.status === "accepted").length);
          const sorted = [...allApps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
          setApplicants(
            sorted.map((a) => ({
              id: a.id,
              status: a.status,
              created_at: a.created_at,
              internship_title: a.internship_title,
              student_name: undefined,
            }))
          );
        })
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
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
