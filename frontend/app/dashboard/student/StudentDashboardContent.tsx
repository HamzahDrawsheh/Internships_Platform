"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import { StatCard, EmptyState, Button } from "@/components/ui";
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

  const submitted = applications.length;
  const accepted = applications.filter((a) => a.status === "accepted").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;
  const tableRows = applications.slice(0, 10);

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
        <StatCard label="Applications submitted" value={submitted} />
        <StatCard label="Accepted internships" value={accepted} />
        <StatCard label="Rejected applications" value={rejected} />
      </div>

      {/* Table */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
              <p className="text-sm text-gray-500">Your internship applications and their status.</p>
            </div>
            {applications.length > 10 && (
              <Link href="/applications">
                <Button variant="secondary">View all</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          {tableRows.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No applications yet"
                description="Apply to internships to see them here."
                actionLabel="Browse internships"
                actionHref="/internships"
              />
            </div>
          ) : (
            <ApplicationTable applications={tableRows} showViewAction />
          )}
        </div>
      </section>
    </div>
  );
}
