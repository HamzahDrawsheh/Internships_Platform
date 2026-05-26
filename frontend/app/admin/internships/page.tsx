"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Badge, Button, EmptyState, Input, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";

type InternshipRow = {
  id: string;
  title: string;
  company_name: string;
  is_active: boolean;
  created_at: string;
  application_count: number;
};

type ActiveFilter = "all" | "active" | "inactive";

export default function AdminInternshipsPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InternshipRow[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const loadInternships = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const { data: positions, error: positionsError } = await supabase
      .from("internship_positions")
      .select("id, title, company_id, is_active, created_at")
      .order("created_at", { ascending: false });

    if (positionsError) {
      console.error("admin internships query error:", positionsError);
      setError("Unable to load internship listings.");
      setLoading(false);
      return;
    }

    const safePositions = positions ?? [];
    const companyIds = [...new Set(safePositions.map((p) => p.company_id))];
    const positionIds = safePositions.map((p) => p.id);

    const [{ data: companies }, { data: applications }] = await Promise.all([
      companyIds.length
        ? supabase.from("companies").select("id, company_name").in("id", companyIds)
        : Promise.resolve({ data: [] as { id: string; company_name: string | null }[] }),
      positionIds.length
        ? supabase.from("applications").select("position_id").in("position_id", positionIds)
        : Promise.resolve({ data: [] as { position_id: string }[] }),
    ]);

    const companyById = new Map((companies ?? []).map((c) => [c.id, c.company_name?.trim() || "—"]));
    const appCountByPosition = new Map<string, number>();
    for (const app of applications ?? []) {
      appCountByPosition.set(app.position_id, (appCountByPosition.get(app.position_id) ?? 0) + 1);
    }

    setRows(
      safePositions.map((p) => ({
        id: p.id,
        title: p.title?.trim() || "Untitled",
        company_name: companyById.get(p.company_id) ?? "—",
        is_active: Boolean(p.is_active),
        created_at: p.created_at,
        application_count: appCountByPosition.get(p.id) ?? 0,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessLoading && isAdmin) {
      void loadInternships();
    }
  }, [accessLoading, isAdmin, loadInternships]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeFilter === "active" && !row.is_active) return false;
      if (activeFilter === "inactive" && row.is_active) return false;
      if (!q) return true;
      return (
        row.title.toLowerCase().includes(q) ||
        row.company_name.toLowerCase().includes(q)
      );
    });
  }, [rows, search, activeFilter]);

  const toggleActive = async (positionId: string, isActive: boolean) => {
    setActionLoading(positionId);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("admin_set_internship_active", {
      p_position_id: positionId,
      p_is_active: isActive,
    });
    setActionLoading(null);
    if (rpcError) {
      console.error("admin internship active rpc error:", rpcError);
      setError(rpcError.message);
      return;
    }
    await loadInternships();
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
          title="Internship Moderation"
          description="Activate or deactivate any internship listing across the platform."
        />

        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Title or company…"
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Visibility
            </label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
          <EmptyState title="No internships found" description="Try adjusting your filters." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table
              headers={["Title", "Company", "Applications", "Status", "Posted", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {filteredRows.map((row) => {
                const busy = actionLoading === row.id;
                return (
                  <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{row.company_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{row.application_count}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="warning">Inactive</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {row.is_active ? (
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => void toggleActive(row.id, false)}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          disabled={busy}
                          onClick={() => void toggleActive(row.id, true)}
                        >
                          Activate
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
