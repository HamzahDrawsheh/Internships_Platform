"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { DashboardStatCard, DashboardStatGrid } from "@/components/dashboard/DashboardStatCard";
import { DashboardPageSkeleton } from "@/components/loading";
import { Badge, Button, EmptyState, Table } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type RecentApplicationRow = {
  id: string;
  studentName: string;
  companyName: string;
  internshipTitle: string;
  appliedAt: string;
  status: "pending" | "accepted" | "rejected" | "completed";
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

function applicationStatusBadge(status: RecentApplicationRow["status"]) {
  switch (status) {
    case "pending":
      return <Badge variant="warning">Pending</Badge>;
    case "accepted":
      return <Badge variant="success">Active</Badge>;
    case "completed":
      return <Badge variant="info">Completed</Badge>;
    case "rejected":
      return <Badge variant="danger">Rejected</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [recentApplications, setRecentApplications] = useState<RecentApplicationRow[]>([]);

  const totalPendingOnboarding = counts.pendingCompanyRequests + counts.pendingSupervisorRequests;

  const welcomeSubtitle = useMemo(() => {
    if (totalPendingOnboarding > 0) {
      const parts: string[] = [];
      if (counts.pendingCompanyRequests > 0) {
        parts.push(
          `${counts.pendingCompanyRequests} company request${counts.pendingCompanyRequests === 1 ? "" : "s"}`,
        );
      }
      if (counts.pendingSupervisorRequests > 0) {
        parts.push(
          `${counts.pendingSupervisorRequests} supervisor request${counts.pendingSupervisorRequests === 1 ? "" : "s"}`,
        );
      }
      return `${parts.join(" and ")} awaiting onboarding approval.`;
    }
    if (counts.applications > 0) {
      return `${counts.applications} total application${counts.applications === 1 ? "" : "s"} across the platform.`;
    }
    return "Platform overview and key metrics.";
  }, [totalPendingOnboarding, counts.pendingCompanyRequests, counts.pendingSupervisorRequests, counts.applications]);

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

      const emailPrefix = user.email?.split("@")[0]?.trim() || "Admin";
      const resolvedName =
        (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
        (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
        emailPrefix;
      setAdminName(resolvedName);

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
          status: "pending" | "accepted" | "rejected" | "completed";
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
    <main className="bg-gray-50 py-6 transition-colors duration-300 sm:py-8 dark:bg-gray-950">
      <Container>
        <section className="animate-fade-up rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
                Welcome back, {adminName} 👋
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{welcomeSubtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {totalPendingOnboarding > 0 ? (
                <Link href="/admin/onboarding-requests">
                  <Button variant="primary">Review pending requests ({totalPendingOnboarding})</Button>
                </Link>
              ) : null}
              <Link
                href="/admin/users"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                Manage users
              </Link>
              <Link
                href="/admin/feedbacks"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-purple-300 dark:focus-visible:ring-offset-gray-900"
              >
                Moderate feedback
              </Link>
            </div>
          </div>
        </section>

        {loading ? (
          <DashboardPageSkeleton showWelcome={false} showTable className="mt-8" />
        ) : error ? (
          <p className="mt-8 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : (
          <>
            <section className="mt-8">
              <DashboardStatGrid>
                <DashboardStatCard
                  label="Total students"
                  value={counts.students}
                  cardClass="bg-purple-100 text-purple-900 dark:bg-purple-500/10 dark:text-purple-300"
                />
                <DashboardStatCard
                  label="Total supervisors"
                  value={counts.supervisors}
                  cardClass="bg-indigo-100 text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-300"
                />
                <DashboardStatCard
                  label="Total companies"
                  value={counts.companies}
                  cardClass="bg-teal-100 text-teal-900 dark:bg-teal-500/10 dark:text-teal-300"
                />
                <DashboardStatCard
                  label="Total applications"
                  value={counts.applications}
                  cardClass="bg-sky-100 text-sky-900 dark:bg-sky-500/10 dark:text-sky-300"
                />
              </DashboardStatGrid>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Onboarding approvals</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Review pending company and supervisor onboarding requests.
                  </p>
                </div>
                <Link href="/admin/onboarding-requests">
                  <Button variant="primary">Review pending requests</Button>
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <article className="animate-fade-up rounded-2xl bg-amber-100 p-5 text-amber-900 shadow-sm dark:bg-amber-500/10 dark:text-amber-300">
                  <p className="text-sm font-medium">Pending company</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{counts.pendingCompanyRequests}</p>
                </article>
                <article className="animate-fade-up rounded-2xl bg-orange-100 p-5 text-orange-900 shadow-sm dark:bg-orange-500/10 dark:text-orange-300">
                  <p className="text-sm font-medium">Pending supervisor</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{counts.pendingSupervisorRequests}</p>
                </article>
                <article className="animate-fade-up rounded-2xl bg-violet-100 p-5 text-violet-900 shadow-sm dark:bg-violet-500/10 dark:text-violet-300">
                  <p className="text-sm font-medium">Internship positions</p>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{counts.internshipPositions}</p>
                </article>
              </div>
            </section>

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent applications</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Latest platform-wide internship applications.
              </p>
              {recentApplications.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="No application data yet"
                  description="Recent applications will appear here once students start applying."
                />
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <Table
                    headers={["Student", "Company", "Internship", "Applied", "Status"]}
                    className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
                  >
                    {recentApplications.map((row) => (
                      <tr key={row.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.studentName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{row.companyName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.internshipTitle}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                          {row.appliedAt}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">{applicationStatusBadge(row.status)}</td>
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
