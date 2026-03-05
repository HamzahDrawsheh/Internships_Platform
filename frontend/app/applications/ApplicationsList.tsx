"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import EmptyState from "@/components/common/EmptyState";
import type { Application } from "@/lib/types";

export default function ApplicationsList() {
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
          cover_letter,
          created_at,
          internship:internships(
            title,
            company:profiles!company_id(full_name)
          )
        `)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            setApplications([]);
          } else {
            const rows = (data ?? []).map((row: Record<string, unknown>) => {
              const inv = row.internship as { title?: string; company?: { full_name?: string } } | null;
              return {
                id: row.id,
                internship_id: row.internship_id,
                student_id: row.student_id,
                status: row.status,
                cover_letter: row.cover_letter,
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

  if (loading) return <p className="text-gray-600">Loading…</p>;
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Apply to internships to see them here."
        actionLabel="Browse internships"
        actionHref="/internships"
      />
    );
  }
  return <ApplicationTable applications={applications} showViewAction />;
}
