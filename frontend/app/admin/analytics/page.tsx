"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardPageSkeleton } from "@/components/loading";
import { Card, EmptyState, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";

type PlatformAnalytics = {
  students: number;
  supervisors: number;
  companies: number;
  active_positions: number;
  applications: number;
  suspended_users: number;
  hidden_feedbacks: number;
  top_companies_by_applications: Array<{
    company_id: string;
    company_name: string;
    application_count: number;
  }>;
  top_internships_by_applications: Array<{
    position_id: string;
    title: string;
    company_name: string;
    application_count: number;
    is_active: boolean;
  }>;
};

export default function AdminAnalyticsPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    if (accessLoading || !isAdmin) return;

    const supabase = createClient();
    void (async () => {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc("admin_get_platform_analytics");
      if (rpcError) {
        console.error("admin analytics rpc error:", rpcError);
        setError("Unable to load analytics. Ensure the latest database migration is applied.");
        setLoading(false);
        return;
      }
      setAnalytics(data as PlatformAnalytics);
      setLoading(false);
    })();
  }, [accessLoading, isAdmin]);

  if (accessLoading || (isAdmin && loading)) {
    return (
      <main className="py-8">
        <Container>
          <DashboardPageSkeleton showWelcome={false} />
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

  if (error || !analytics) {
    return (
      <main className="py-8">
        <Container>
          <PageHeader title="Analytics" description="Platform-wide metrics and rankings." />
          <EmptyState
            title="Analytics unavailable"
            description={error ?? "No data returned from the server."}
          />
        </Container>
      </main>
    );
  }

  const statCards = [
    { label: "Students", value: analytics.students },
    { label: "Supervisors", value: analytics.supervisors },
    { label: "Companies", value: analytics.companies },
    { label: "Active listings", value: analytics.active_positions },
    { label: "Applications", value: analytics.applications },
    { label: "Suspended users", value: analytics.suspended_users },
    { label: "Hidden feedbacks", value: analytics.hidden_feedbacks },
  ];

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader title="Analytics" description="Platform-wide metrics and rankings." />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.label} className="p-5">
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{card.value}</p>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Most active companies
            </h2>
            {(analytics.top_companies_by_applications ?? []).length === 0 ? (
              <EmptyState title="No company data yet" description="Rankings appear once applications exist." />
            ) : (
              <Table headers={["Company", "Applications"]}>
                {analytics.top_companies_by_applications.map((row) => (
                  <tr key={row.company_id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {row.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-slate-400">
                      {row.application_count}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
              Most applied internships
            </h2>
            {(analytics.top_internships_by_applications ?? []).length === 0 ? (
              <EmptyState title="No internship data yet" description="Rankings appear once students apply." />
            ) : (
              <Table headers={["Internship", "Company", "Applications", "Live"]}>
                {analytics.top_internships_by_applications.map((row) => (
                  <tr key={row.position_id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.title ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {row.company_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-slate-400">
                      {row.application_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {row.is_active ? "Yes" : "No"}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
