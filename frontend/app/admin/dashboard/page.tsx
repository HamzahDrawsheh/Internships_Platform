"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, Card, EmptyState, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type RecentApplicationRow = {
  id: string;
  studentName: string;
  companyName: string;
  internshipTitle: string;
  appliedAt: string;
  status: "pending" | "accepted" | "rejected";
};

type DashboardCounts = {
  students: number;
  supervisors: number;
  companies: number;
  internshipPositions: number;
  applications: number;
  pendingCompanyRequests: number;
  pendingSupervisorRequests: number;
};

const initialCounts: DashboardCounts = {
  students: 0,
  supervisors: 0,
  companies: 0,
  internshipPositions: 0,
  applications: 0,
  pendingCompanyRequests: 0,
  pendingSupervisorRequests: 0,
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [recentApplications, setRecentApplications] = useState<RecentApplicationRow[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const formatDate = (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
    };

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        console.error("admin dashboard getUser error:", userError);
        setError("Unable to load your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to access the admin dashboard.");
        setLoading(false);
        return;
      }

      const [
        studentsCountResult,
        supervisorsCountResult,
        companiesCountResult,
        positionsCountResult,
        applicationsCountResult,
        pendingCompanyRequestsCountResult,
        pendingSupervisorRequestsCountResult,
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("supervisors").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("internship_positions").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase
          .from("role_upgrade_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("requested_role", "company"),
        supabase
          .from("role_upgrade_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("requested_role", "supervisor"),
      ]);

      if (
        studentsCountResult.error ||
        supervisorsCountResult.error ||
        companiesCountResult.error ||
        positionsCountResult.error ||
        applicationsCountResult.error ||
        pendingCompanyRequestsCountResult.error ||
        pendingSupervisorRequestsCountResult.error
      ) {
        console.error("admin dashboard count query error:", {
          students: studentsCountResult.error,
          supervisors: supervisorsCountResult.error,
          companies: companiesCountResult.error,
          internship_positions: positionsCountResult.error,
          applications: applicationsCountResult.error,
          pending_company_requests: pendingCompanyRequestsCountResult.error,
          pending_supervisor_requests: pendingSupervisorRequestsCountResult.error,
        });
        setError("Unable to load dashboard metrics.");
        setLoading(false);
        return;
      }

      setCounts({
        students: studentsCountResult.count ?? 0,
        supervisors: supervisorsCountResult.count ?? 0,
        companies: companiesCountResult.count ?? 0,
        internshipPositions: positionsCountResult.count ?? 0,
        applications: applicationsCountResult.count ?? 0,
        pendingCompanyRequests: pendingCompanyRequestsCountResult.count ?? 0,
        pendingSupervisorRequests: pendingSupervisorRequestsCountResult.count ?? 0,
      });

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("id, student_id, position_id, applied_at, status")
        .order("applied_at", { ascending: false })
        .limit(5);

      if (appError) {
        console.error("admin dashboard recent applications query error:", appError);
        setError("Unable to load recent applications.");
        setLoading(false);
        return;
      }

      const safeApplications =
        (appRows ??
          []) as {
          id: string;
          student_id: string;
          position_id: string;
          applied_at: string;
          status: "pending" | "accepted" | "rejected";
        }[];

      if (safeApplications.length === 0) {
        setRecentApplications([]);
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(safeApplications.map((row) => row.student_id))];
      const positionIds = [...new Set(safeApplications.map((row) => row.position_id))];

      const { data: studentsData, error: studentsError } = studentIds.length
        ? await supabase.from("students").select("id, user_id").in("id", studentIds)
        : { data: [] as { id: string; user_id: string }[], error: null };
      if (studentsError) {
        console.error("admin dashboard students query error:", studentsError);
      }

      const userIds = [...new Set((studentsData ?? []).map((student) => student.user_id))];
      const { data: profilesData, error: profilesError } = userIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
        : { data: [] as { id: string; full_name: string | null }[], error: null };
      if (profilesError) {
        console.error("admin dashboard profiles query error:", profilesError);
      }

      const { data: positionsData, error: positionsError } = positionIds.length
        ? await supabase
            .from("internship_positions")
            .select("id, title, company_id")
            .in("id", positionIds)
        : { data: [] as { id: string; title: string | null; company_id: string }[], error: null };
      if (positionsError) {
        console.error("admin dashboard internship_positions query error:", positionsError);
      }

      const companyIds = [...new Set((positionsData ?? []).map((position) => position.company_id))];
      const { data: companiesData, error: companiesError } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string | null }[], error: null };
      if (companiesError) {
        console.error("admin dashboard companies query error:", companiesError);
      }

      const studentById = new Map((studentsData ?? []).map((student) => [student.id, student]));
      const profileByUserId = new Map((profilesData ?? []).map((profile) => [profile.id, profile]));
      const positionById = new Map((positionsData ?? []).map((position) => [position.id, position]));
      const companyById = new Map((companiesData ?? []).map((company) => [company.id, company]));

      const previewRows: RecentApplicationRow[] = safeApplications.map((application) => {
        const student = studentById.get(application.student_id);
        const profile = student ? profileByUserId.get(student.user_id) : null;
        const position = positionById.get(application.position_id);
        const company = position ? companyById.get(position.company_id) : null;

        return {
          id: application.id,
          studentName: profile?.full_name?.trim() || "—",
          companyName: company?.company_name?.trim() || "—",
          internshipTitle: position?.title?.trim() || "—",
          appliedAt: formatDate(application.applied_at),
          status: application.status,
        };
      });

      setRecentApplications(previewRows);
      setLoading(false);
    };

    loadDashboard();
  }, []);

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Admin Dashboard"
          description="Platform overview and key metrics."
        />
        {loading ? (
          <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading dashboard...</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total students</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{counts.students}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total supervisors</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{counts.supervisors}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total companies</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{counts.companies}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Internship positions</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{counts.internshipPositions}</p>
              </Card>
              <Card>
                <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Total applications</p>
                <p className="text-2xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">{counts.applications}</p>
              </Card>
            </div>
            <section className="mt-8">
              <Card>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                      Onboarding approvals
                    </h2>
                    <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                      Review pending company and supervisor onboarding requests.
                    </p>
                  </div>
                  <Link href="/admin/onboarding-requests">
                    <Button variant="primary">Review Pending Requests</Button>
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      Pending Company
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">
                      {counts.pendingCompanyRequests}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      Pending Supervisor
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">
                      {counts.pendingSupervisorRequests}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-800/60">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      Total Pending
                    </p>
                    <p className="mt-1 text-xl font-bold text-gray-900 transition-colors duration-300 dark:text-white">
                      {counts.pendingCompanyRequests + counts.pendingSupervisorRequests}
                    </p>
                  </div>
                </div>
              </Card>
            </section>
            <section className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Recent applications</h2>
              <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">Latest platform-wide internship applications.</p>
              {recentApplications.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="No application data yet"
                  description="Recent applications will appear here once students start applying."
                />
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                  <Table
                    headers={["Student", "Company", "Internship", "Applied", "Status"]}
                    className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
                  >
                    {recentApplications.map((row) => (
                      <tr key={row.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{row.studentName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.companyName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">{row.internshipTitle}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.appliedAt}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">{row.status}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
