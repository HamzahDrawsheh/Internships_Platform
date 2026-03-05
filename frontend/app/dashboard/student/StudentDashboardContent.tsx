"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import type { Application } from "@/lib/types";

export default function StudentDashboardContent() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }
      supabase
        .from("applications")
        .select(`
          id,
          internship_id,
          student_id,
          status,
          created_at,
          internship:internships(title, company:profiles!company_id(full_name))
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) setApplications([]);
          else {
            const rows = (data ?? []).map((row: Record<string, unknown>) => {
              const inv = row.internship as { title?: string; company?: { full_name?: string } } | null;
              return {
                id: row.id,
                internship_id: row.internship_id,
                student_id: row.student_id,
                status: row.status,
                created_at: row.created_at,
                internship_title: inv?.title ?? null,
                company_name: inv?.company?.full_name ?? null,
              };
            }) as Application[];
            setApplications(rows);
          }
          setLoading(false);
        });
    });
  }, []);

  const total = applications.length;
  const underReview = applications.filter((a) => a.status === "under_review").length;
  const accepted = applications.filter((a) => a.status === "accepted").length;
  const recent = applications.slice(0, 5);

  if (loading) return <p className="text-gray-600">Loading…</p>;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total applications</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Under review</p>
          <p className="text-2xl font-bold text-gray-900">{underReview}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-2xl font-bold text-gray-900">{accepted}</p>
        </div>
      </div>
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent applications</h2>
        <p className="text-sm text-gray-600">Last 5 applications</p>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No applications yet.</p>
        ) : (
          <div className="mt-4">
            <ApplicationTable applications={recent} showViewAction />
          </div>
        )}
      </section>
    </>
  );
}
