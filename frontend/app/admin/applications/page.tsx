"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import ApplicationStatusBadge from "@/components/applications/ApplicationStatusBadge";
import { EmptyState, Input, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";

type ApplicationStatus =
  | "pending"
  | "accepted_pending_commit"
  | "accepted"
  | "rejected"
  | "completed"
  | "commitment_expired"
  | "withdrawn";

type ApplicationRow = {
  id: string;
  student_name: string;
  company_name: string;
  internship_title: string;
  status: ApplicationStatus;
  applied_at: string;
};

type StatusFilter = "all" | ApplicationStatus;

const STATUSES: ApplicationStatus[] = [
  "pending",
  "accepted_pending_commit",
  "accepted",
  "rejected",
  "completed",
  "commitment_expired",
  "withdrawn",
];

function statusBadge(status: ApplicationStatus) {
  const labels: Record<ApplicationStatus, string> = {
    pending: "Pending",
    accepted_pending_commit: "Awaiting confirmation",
    accepted: "Accepted",
    completed: "Completed",
    rejected: "Rejected",
    commitment_expired: "Offer expired",
    withdrawn: "Withdrawn",
  };
  return <ApplicationStatusBadge status={status} label={labels[status]} />;
}

export default function AdminApplicationsPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: applications, error: appError } = await supabase
      .from("applications")
      .select("id, student_id, position_id, status, applied_at")
      .order("applied_at", { ascending: false });

    if (appError) {
      console.error("admin applications query error:", appError);
      setError("Unable to load applications.");
      setLoading(false);
      return;
    }

    const safeApps = applications ?? [];
    const studentIds = [...new Set(safeApps.map((a) => a.student_id))];
    const positionIds = [...new Set(safeApps.map((a) => a.position_id))];

    const [{ data: students }, { data: positions }] = await Promise.all([
      studentIds.length
        ? supabase.from("students").select("id, user_id").in("id", studentIds)
        : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
      positionIds.length
        ? supabase.from("internship_positions").select("id, title, company_id").in("id", positionIds)
        : Promise.resolve({ data: [] as { id: string; title: string | null; company_id: string }[] }),
    ]);

    const userIds = [...new Set((students ?? []).map((s) => s.user_id))];
    const companyIds = [...new Set((positions ?? []).map((p) => p.company_id))];

    const [{ data: profiles }, { data: companies }] = await Promise.all([
      userIds.length
        ? supabase.from("profiles").select("id, full_name").in("id", userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
      companyIds.length
        ? supabase.from("companies").select("id, company_name").in("id", companyIds)
        : Promise.resolve({ data: [] as { id: string; company_name: string | null }[] }),
    ]);

    const studentById = new Map((students ?? []).map((s) => [s.id, s]));
    const profileByUserId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const positionById = new Map((positions ?? []).map((p) => [p.id, p]));
    const companyById = new Map((companies ?? []).map((c) => [c.id, c]));

    setRows(
      safeApps.map((app) => {
        const student = studentById.get(app.student_id);
        const profile = student ? profileByUserId.get(student.user_id) : null;
        const position = positionById.get(app.position_id);
        const company = position ? companyById.get(position.company_id) : null;
        return {
          id: app.id,
          student_name: profile?.full_name?.trim() || "—",
          company_name: company?.company_name?.trim() || "—",
          internship_title: position?.title?.trim() || "—",
          status: app.status as ApplicationStatus,
          applied_at: app.applied_at,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessLoading && isAdmin) {
      void Promise.resolve().then(loadApplications);
    }
  }, [accessLoading, isAdmin, loadApplications]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.student_name.toLowerCase().includes(q) ||
        row.company_name.toLowerCase().includes(q) ||
        row.internship_title.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const handleStatusChange = async (applicationId: string, status: ApplicationStatus) => {
    setActionLoading(applicationId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_set_application_status", {
      p_application_id: applicationId,
      p_status: status,
    });
    setActionLoading(null);
    if (rpcError) {
      console.error("admin application status rpc error:", rpcError);
      setError(rpcError.message);
      return;
    }
    await loadApplications();
  };

  if (accessLoading || (isAdmin && loading)) {
    return (
      <main className="py-8">
        <Container>
          <TableListPageSkeleton showWelcome={false} />
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

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Applications"
          description="View all internship applications and override status when needed."
        />

        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student, company, or internship…"
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <Input label="Showing" value={String(filteredRows.length)} readOnly />
        </div>

        {error ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {filteredRows.length === 0 ? (
          <EmptyState title="No applications found" description="Try adjusting your filters." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table
              headers={["Student", "Company", "Internship", "Applied", "Status", "Override"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {filteredRows.map((row) => {
                const busy = actionLoading === row.id;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.student_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{row.company_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{row.internship_title}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(row.applied_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{statusBadge(row.status)}</td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={row.status}
                        disabled={busy}
                        onChange={(e) =>
                          void handleStatusChange(row.id, e.target.value as ApplicationStatus)
                        }
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm capitalize dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        )}
      </Container>
    </main>
  );
}
