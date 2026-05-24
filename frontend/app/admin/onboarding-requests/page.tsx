"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Button, EmptyState, Input, Modal, Table, Textarea } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type RequestStatus = "pending" | "approved" | "rejected";
type RequestedRole = "company" | "supervisor";
type StatusFilter = "all" | RequestStatus;
type RoleFilter = "all" | RequestedRole;

type RoleUpgradeRequestRow = {
  id: string;
  user_id: string;
  requester_name: string;
  requester_email: string;
  requested_role: RequestedRole;
  status: RequestStatus;
  submitted_at: string;
  admin_notes: string | null;
  payload: Record<string, unknown> | null;
};

export default function AdminOnboardingRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<RoleUpgradeRequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const loadRequests = async (status: StatusFilter, role: RoleFilter) => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("admin onboarding requests getUser error:", userError);
      setError("Unable to load your account.");
      setLoading(false);
      return;
    }

    if (!user) {
      setError("Please login to access this page.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("admin onboarding requests profile role error:", profileError);
      setError("Unable to verify admin access.");
      setLoading(false);
      return;
    }

    if (profile?.role !== "admin") {
      setError("Access denied. Admin role is required.");
      setLoading(false);
      return;
    }

    let query = supabase
      .from("role_upgrade_requests")
      .select("id, user_id, requested_role, status, submitted_at, admin_notes, payload")
      .order("submitted_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (role !== "all") {
      query = query.eq("requested_role", role);
    }

    const { data, error: requestsError } = await query;
    if (requestsError) {
      console.error("admin onboarding requests query error:", requestsError);
      setError("Unable to load onboarding requests.");
      setLoading(false);
      return;
    }

    const rawRows = (data ??
      []) as {
      id: string;
      user_id: string;
      requested_role: RequestedRole;
      status: RequestStatus;
      submitted_at: string;
      admin_notes: string | null;
      payload: Record<string, unknown> | null;
    }[];

    const userIds = [...new Set(rawRows.map((row) => row.user_id))];
    const { data: requesterProfiles, error: requesterProfilesError } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[], error: null };

    if (requesterProfilesError) {
      console.error("admin onboarding requester profiles query error:", requesterProfilesError);
    }

    const requesterById = new Map(
      (requesterProfiles ?? []).map((profile) => [
        profile.id,
        {
          name: profile.full_name?.trim() || "—",
          email: profile.email ?? "—",
        },
      ])
    );

    setRows(
      rawRows.map((row) => {
        const requester = requesterById.get(row.user_id);
        return {
          ...row,
          requester_name: requester?.name ?? "—",
          requester_email: requester?.email ?? "—",
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRequests(statusFilter, roleFilter);
  }, [statusFilter, roleFilter]);

  const payloadPreview = (payload: Record<string, unknown> | null) => {
    if (!payload || Object.keys(payload).length === 0) {
      return "—";
    }
    const raw = JSON.stringify(payload);
    return raw.length > 100 ? `${raw.slice(0, 100)}...` : raw;
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: approveError } = await supabase.rpc("approve_role_upgrade_request", {
      p_request_id: requestId,
    });

    setActionLoading(false);

    if (approveError) {
      console.error("admin onboarding approve rpc error:", approveError);
      setError(approveError.message);
      return;
    }

    await loadRequests(statusFilter, roleFilter);
  };

  const openRejectModal = (requestId: string) => {
    setRejectTargetId(requestId);
    setAdminNotes("");
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    setActionLoading(true);
    setError(null);
    const supabase = createClient();

    const { error: rejectError } = await supabase.rpc("reject_role_upgrade_request", {
      p_request_id: rejectTargetId,
      p_admin_notes: adminNotes.trim() ? adminNotes.trim() : null,
    });

    setActionLoading(false);

    if (rejectError) {
      console.error("admin onboarding reject rpc error:", rejectError);
      setError(rejectError.message);
      return;
    }

    setRejectModalOpen(false);
    setRejectTargetId(null);
    setAdminNotes("");
    await loadRequests(statusFilter, roleFilter);
  };

  const total = useMemo(() => rows.length, [rows.length]);

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Onboarding Requests"
          description="Review company and supervisor onboarding requests."
        />

          <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors duration-300 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors duration-300 dark:text-slate-400">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 transition-colors duration-300 dark:text-slate-400">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="company">Company</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          <div className="flex items-end">
            <Input
              label="Result count"
              value={String(total)}
              readOnly
              className="w-full"
            />
          </div>
        </div>

        {loading ? (
          <TableListPageSkeleton showWelcome={false} />
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No requests found"
            description="No onboarding requests match the selected filters."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
            <Table
              headers={["Applicant", "Email", "Role", "Status", "Submitted", "Payload", "Admin Notes", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {rows.map((row) => (
                <tr key={row.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
                  <td className="px-4 py-3 text-sm text-gray-900 transition-colors duration-300 dark:text-white">
                    {row.requester_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {row.requester_email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-700 transition-colors duration-300 dark:text-slate-300">
                    {row.requested_role}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm capitalize text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {row.status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {new Date(row.submitted_at).toLocaleString()}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {payloadPreview(row.payload)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                    {row.admin_notes?.trim() ? row.admin_notes : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {row.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          disabled={actionLoading}
                          onClick={() => handleApprove(row.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          disabled={actionLoading}
                          onClick={() => openRejectModal(row.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                        Reviewed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}

        <Modal
          isOpen={rejectModalOpen}
          onClose={() => {
            if (actionLoading) return;
            setRejectModalOpen(false);
            setRejectTargetId(null);
          }}
          title="Reject Request"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectTargetId(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleReject} disabled={actionLoading}>
                {actionLoading ? "Rejecting..." : "Confirm Reject"}
              </Button>
            </>
          }
        >
          <Textarea
            label="Admin notes (optional)"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Reason for rejection..."
            rows={4}
          />
        </Modal>
      </Container>
    </main>
  );
}
