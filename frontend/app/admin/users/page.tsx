"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Button, EmptyState, Input, StatusText, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRole } from "@/lib/types";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: ProfileRole;
  is_suspended: boolean;
  created_at: string;
};

type RoleFilter = "all" | ProfileRole;
type StatusFilter = "all" | "active" | "suspended";

const ROLES: ProfileRole[] = ["student", "company", "supervisor", "admin"];

export default function AdminUsersPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, is_suspended, created_at")
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("admin users query error:", queryError);
      setError("Unable to load users.");
      setLoading(false);
      return;
    }

    setRows(
      (data ?? []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        role: row.role as ProfileRole,
        is_suspended: Boolean(row.is_suspended),
        created_at: row.created_at,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessLoading && isAdmin) {
      void Promise.resolve().then(loadUsers);
    }
  }, [accessLoading, isAdmin, loadUsers]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== "all" && row.role !== roleFilter) return false;
      if (statusFilter === "active" && row.is_suspended) return false;
      if (statusFilter === "suspended" && !row.is_suspended) return false;
      if (!q) return true;
      const name = row.full_name?.toLowerCase() ?? "";
      const email = row.email?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q);
    });
  }, [rows, search, roleFilter, statusFilter]);

  const handleSuspend = async (userId: string, suspended: boolean) => {
    setActionLoading(userId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_set_user_suspended", {
      p_user_id: userId,
      p_suspended: suspended,
    });
    setActionLoading(null);
    if (rpcError) {
      console.error("admin suspend rpc error:", rpcError);
      setError(rpcError.message);
      return;
    }
    await loadUsers();
  };

  const handleRoleChange = async (userId: string, role: ProfileRole) => {
    setActionLoading(userId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: role,
    });
    setActionLoading(null);
    if (rpcError) {
      console.error("admin role rpc error:", rpcError);
      setError(rpcError.message);
      return;
    }
    await loadUsers();
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
          title="User Management"
          description="View all accounts, change roles, and suspend or restore access."
        />

        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 transition-colors duration-300 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email…"
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All roles</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
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
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
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
          <EmptyState title="No users found" description="Try adjusting your filters." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table
              headers={["User", "Email", "Role", "Status", "Joined", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {filteredRows.map((row) => {
                const isSelf = row.id === currentUserId;
                const busy = actionLoading === row.id;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.full_name?.trim() || "—"}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">(you)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{row.email ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={row.role}
                        disabled={busy || isSelf}
                        onChange={(e) => void handleRoleChange(row.id, e.target.value as ProfileRole)}
                        className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm capitalize dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.is_suspended ? (
                        <StatusText variant="danger">Suspended</StatusText>
                      ) : (
                        <StatusText variant="success">Active</StatusText>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {isSelf ? (
                        <span className="text-xs text-gray-500 dark:text-slate-400">—</span>
                      ) : row.is_suspended ? (
                        <Button variant="secondary" disabled={busy} onClick={() => void handleSuspend(row.id, false)}>
                          Restore
                        </Button>
                      ) : (
                        <Button variant="danger" disabled={busy} onClick={() => void handleSuspend(row.id, true)}>
                          Suspend
                        </Button>
                      )}
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
