"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableListPageSkeleton } from "@/components/loading";
import { Badge, Button, EmptyState, Input, Table } from "@/components/ui";
import { useAdminAccess } from "@/lib/admin/use-admin-access";
import { createClient } from "@/lib/supabase/client";

type FeedbackSource = "training" | "legacy";

type FeedbackRow = {
  id: string;
  source: FeedbackSource;
  company_name: string;
  rating: number;
  notes: string | null;
  is_hidden: boolean;
  created_at: string;
};

type SourceFilter = "all" | FeedbackSource;
type VisibilityFilter = "all" | "visible" | "hidden";

export default function AdminFeedbacksPage() {
  const { loading: accessLoading, isAdmin, error: accessError } = useAdminAccess();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data: training, error: trainingError }, { data: legacy, error: legacyError }] =
      await Promise.all([
        supabase
          .from("student_training_evaluations")
          .select(
            "id, is_hidden, other_notes, created_at, overall_rating, mentorship_rating, environment_rating, skills_rating, application_id",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("ratings")
          .select("id, is_hidden, feedback, created_at, rating, company_id")
          .order("created_at", { ascending: false }),
      ]);

    if (trainingError || legacyError) {
      console.error("admin feedbacks query error:", trainingError ?? legacyError);
      setError("Unable to load feedback records.");
      setLoading(false);
      return;
    }

    const applicationIds = [...new Set((training ?? []).map((t) => t.application_id))];
    const companyIdsFromLegacy = [...new Set((legacy ?? []).map((r) => r.company_id))];

    const [{ data: applications }, { data: legacyCompanies }] = await Promise.all([
      applicationIds.length
        ? supabase.from("applications").select("id, position_id").in("id", applicationIds)
        : Promise.resolve({ data: [] as { id: string; position_id: string }[] }),
      companyIdsFromLegacy.length
        ? supabase.from("companies").select("id, company_name").in("id", companyIdsFromLegacy)
        : Promise.resolve({ data: [] as { id: string; company_name: string | null }[] }),
    ]);

    const positionIds = [...new Set((applications ?? []).map((a) => a.position_id))];
    const { data: positions } = positionIds.length
      ? await supabase.from("internship_positions").select("id, company_id").in("id", positionIds)
      : { data: [] as { id: string; company_id: string }[] };

    const trainingCompanyIds = [...new Set((positions ?? []).map((p) => p.company_id))];
    const allCompanyIds = [...new Set([...trainingCompanyIds, ...companyIdsFromLegacy])];
    const { data: allCompanies } = allCompanyIds.length
      ? await supabase.from("companies").select("id, company_name").in("id", allCompanyIds)
      : { data: [] as { id: string; company_name: string | null }[] };

    const companyById = new Map((allCompanies ?? []).map((c) => [c.id, c.company_name?.trim() || "—"]));
    const positionById = new Map((positions ?? []).map((p) => [p.id, p]));
    const applicationById = new Map((applications ?? []).map((a) => [a.id, a]));

    const trainingRows: FeedbackRow[] = (training ?? []).map((t) => {
      const app = applicationById.get(t.application_id);
      const position = app ? positionById.get(app.position_id) : null;
      const companyName = position ? companyById.get(position.company_id) ?? "—" : "—";
      const avg =
        (t.overall_rating + t.mentorship_rating + t.environment_rating + t.skills_rating) / 4;
      return {
        id: t.id,
        source: "training" as const,
        company_name: companyName,
        rating: Math.round(avg * 10) / 10,
        notes: t.other_notes,
        is_hidden: Boolean(t.is_hidden),
        created_at: t.created_at,
      };
    });

    const legacyByCompany = new Map((legacyCompanies ?? []).map((c) => [c.id, c.company_name?.trim() || "—"]));
    const legacyRows: FeedbackRow[] = (legacy ?? []).map((r) => ({
      id: r.id,
      source: "legacy" as const,
      company_name: legacyByCompany.get(r.company_id) ?? companyById.get(r.company_id) ?? "—",
      rating: r.rating,
      notes: r.feedback,
      is_hidden: Boolean(r.is_hidden),
      created_at: r.created_at,
    }));

    setRows(
      [...trainingRows, ...legacyRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!accessLoading && isAdmin) {
      void loadFeedbacks();
    }
  }, [accessLoading, isAdmin, loadFeedbacks]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (sourceFilter !== "all" && row.source !== sourceFilter) return false;
      if (visibilityFilter === "visible" && row.is_hidden) return false;
      if (visibilityFilter === "hidden" && !row.is_hidden) return false;
      if (!q) return true;
      return (
        row.company_name.toLowerCase().includes(q) ||
        (row.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, search, sourceFilter, visibilityFilter]);

  const toggleHidden = async (row: FeedbackRow, hidden: boolean) => {
    setActionLoading(row.id);
    setError(null);
    const supabase = createClient();
    const rpcName =
      row.source === "training" ? "admin_set_training_feedback_hidden" : "admin_set_rating_hidden";
    const paramKey = row.source === "training" ? "p_feedback_id" : "p_rating_id";
    const { error: rpcError } = await supabase.rpc(rpcName, {
      [paramKey]: row.id,
      p_hidden: hidden,
    });
    setActionLoading(null);
    if (rpcError) {
      console.error("admin feedback hide rpc error:", rpcError);
      setError(rpcError.message);
      return;
    }
    await loadFeedbacks();
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
          title="Feedback Moderation"
          description="Review student feedback and hide inappropriate reviews from public company profiles."
        />

        <div className="mb-4 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Company or notes…"
          />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Source
            </label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="training">Training evaluations</option>
              <option value="legacy">Legacy ratings</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Visibility
            </label>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="visible">Public</option>
              <option value="hidden">Hidden</option>
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
          <EmptyState title="No feedback found" description="Try adjusting your filters." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <Table
              headers={["Company", "Source", "Rating", "Notes", "Status", "Date", "Actions"]}
              className="dark:divide-slate-800 dark:[&_thead]:bg-slate-800 dark:[&_tbody]:bg-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:text-slate-300 dark:[&_tr]:border-slate-800"
            >
              {filteredRows.map((row) => {
                const busy = actionLoading === row.id;
                const notesPreview =
                  row.notes && row.notes.length > 80 ? `${row.notes.slice(0, 80)}…` : row.notes ?? "—";
                return (
                  <tr key={`${row.source}-${row.id}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {row.company_name}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize text-gray-600 dark:text-slate-400">
                      {row.source}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-slate-400">
                      {row.rating}/5
                    </td>
                    <td className="max-w-xs px-4 py-3 text-sm text-gray-600 dark:text-slate-400" title={row.notes ?? undefined}>
                      {notesPreview}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {row.is_hidden ? (
                        <Badge variant="warning">Hidden</Badge>
                      ) : (
                        <Badge variant="success">Public</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {row.is_hidden ? (
                        <Button variant="primary" disabled={busy} onClick={() => void toggleHidden(row, false)}>
                          Show
                        </Button>
                      ) : (
                        <Button variant="danger" disabled={busy} onClick={() => void toggleHidden(row, true)}>
                          Hide
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
