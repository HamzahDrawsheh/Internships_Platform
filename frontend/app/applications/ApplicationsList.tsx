"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import ApplicationTable from "@/components/applications/ApplicationTable";
import EmptyState from "@/components/common/EmptyState";
import type { Application } from "@/lib/types";

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: Application[] }>("/applications")
      .then(({ data }) => setApplications(data ?? []))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
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
