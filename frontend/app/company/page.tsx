"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Position = {
  id: string;
  title: string;
  created_at: string;
};

type Application = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  applied_at: string;
  position_id: string;
};

export default function CompanyHomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasCompanyProfile, setHasCompanyProfile] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("company home user error:", userError);
        setError("Could not load your account.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Please login to access company pages.");
        setLoading(false);
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("company home company error:", companyError);
        setError("Could not load your company profile.");
        setLoading(false);
        return;
      }

      if (!company) {
        setHasCompanyProfile(false);
        setPositions([]);
        setApplications([]);
        setLoading(false);
        return;
      }

      setHasCompanyProfile(true);
      const { data: positionsData, error: positionsError } = await supabase
        .from("internship_positions")
        .select("id, title, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (positionsError) {
        console.error("company home positions error:", positionsError);
        setError("Could not load internship posts.");
        setLoading(false);
        return;
      }

      const safePositions = (positionsData ?? []) as Position[];
      setPositions(safePositions);

      if (safePositions.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const positionIds = safePositions.map((position) => position.id);
      const { data: applicationsData, error: applicationsError } = await supabase
        .from("applications")
        .select("id, status, applied_at, position_id")
        .in("position_id", positionIds)
        .order("applied_at", { ascending: false });

      if (applicationsError) {
        console.error("company home applications error:", applicationsError);
        setError("Could not load applications.");
        setLoading(false);
        return;
      }

      setApplications((applicationsData ?? []) as Application[]);
      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const pending = applications.filter((item) => item.status === "pending").length;
    const accepted = applications.filter((item) => item.status === "accepted").length;
    return {
      internships: positions.length,
      totalApplications: applications.length,
      pendingApplications: pending,
      acceptedApplications: accepted,
    };
  }, [positions, applications]);

  const titleByPositionId = useMemo(() => {
    return new Map(positions.map((position) => [position.id, position.title]));
  }, [positions]);

  const recentPosts = positions.slice(0, 5);
  const recentApplications = applications.slice(0, 5);

  return (
    <Container>
      <PageHeader
        title="Company Dashboard"
        description="Overview of your internship posts and received applications."
        action={
          <Link href="/company/internships/new">
            <Button variant="primary">Create internship</Button>
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading dashboard...</p>
      ) : error ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      ) : !hasCompanyProfile ? (
        <EmptyState
          title="Complete your company profile"
          description="Create your company profile first to start posting internships."
          actionLabel="Go to company profile"
          actionHref="/profile/company"
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total internship posts</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{stats.internships}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total received applications</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{stats.totalApplications}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Pending applications</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{stats.pendingApplications}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Accepted applications</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{stats.acceptedApplications}</p>
            </Card>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Recent posted internships</h2>
            {recentPosts.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No internship posts yet.</p>
            ) : (
              <Table headers={["Title", "Posted"]} className="mt-4">
                {recentPosts.map((post) => (
                  <tr key={post.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{post.title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Recent applications</h2>
            {recentApplications.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No applications received yet.</p>
            ) : (
              <Table headers={["Internship", "Applied", "Status"]} className="mt-4">
                {recentApplications.map((application) => (
                  <tr key={application.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">
                      {titleByPositionId.get(application.position_id) ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                      {new Date(application.applied_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">
                      {application.status}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </section>
        </>
      )}
    </Container>
  );
}
