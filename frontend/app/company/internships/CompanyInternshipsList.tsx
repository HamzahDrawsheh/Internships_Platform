"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dispatchNotification } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase/client";
import EmptyState from "@/components/common/EmptyState";
import { Modal, Button, Table, Badge } from "@/components/ui";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  active: "success",
  inactive: "default",
};

type ListingRow = {
  id: string;
  company_id: string;
  title: string;
  status: string;
  created_at?: string;
  applicants_count?: number;
};

export default function CompanyInternshipsList() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setCompanyId(null);
        setListings([]);
        setLoading(false);
        return;
      }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!company) {
        setCompanyId(null);
        setListings([]);
        setLoading(false);
        return;
      }
      setCompanyId(company.id);

      const { data: positions, error } = await supabase
        .from("internship_positions")
        .select("id, company_id, title, is_active, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (error || !positions?.length) {
        setListings([]);
        setLoading(false);
        return;
      }

      const positionIds = positions.map((p) => p.id);
      const { data: applications } = await supabase
        .from("applications")
        .select("id, position_id")
        .in("position_id", positionIds);

      const countByPositionId = new Map<string, number>();
      (applications ?? []).forEach((app) => {
        countByPositionId.set(app.position_id, (countByPositionId.get(app.position_id) ?? 0) + 1);
      });

      const withCount: ListingRow[] = positions.map((p) => ({
        id: p.id,
        company_id: p.company_id,
        title: p.title,
        status: p.is_active ? "active" : "inactive",
        created_at: p.created_at,
        applicants_count: countByPositionId.get(p.id) ?? 0,
      }));

      setListings(withCount);
      setLoading(false);
    });
  }, []);

  const setListingActive = async (listingId: string, nextIsActive: boolean) => {
    if (!companyId) return;
    setActionError(null);
    setActionMessage(null);
    setActionLoadingId(listingId);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("internship_positions")
        .update({ is_active: nextIsActive })
        .eq("id", listingId)
        .eq("company_id", companyId);

      if (error) {
        console.error("company internships set active error:", error);
        setActionError(error.message || "Failed to update internship status.");
        return;
      }

      if (!nextIsActive) {
        const listingTitle = listings.find((l) => l.id === listingId)?.title?.trim() || "Internship";
        const { data: pendingApps, error: pendingErr } = await supabase
          .from("applications")
          .select("id, student_id")
          .eq("position_id", listingId)
          .eq("status", "pending");

        if (pendingErr) {
          console.error("load pending applications for listing close:", pendingErr);
        } else if (pendingApps?.length) {
          const studentIds = [...new Set(pendingApps.map((a) => a.student_id))];
          const { data: studentRows, error: studentsErr } = await supabase
            .from("students")
            .select("id, user_id")
            .in("id", studentIds);

          if (studentsErr) {
            console.error("load students for application_expired notifications:", studentsErr);
          } else {
            const userIdByStudentId = new Map((studentRows ?? []).map((s) => [s.id, s.user_id]));
            for (const app of pendingApps) {
              const uid = userIdByStudentId.get(app.student_id);
              if (!uid) continue;
              const notifyResult = await dispatchNotification({
                recipientUserId: uid,
                title: "Application closed",
                message: `Your pending application to “${listingTitle}” was closed — this internship listing is no longer active.`,
                type: "application_expired",
                relatedApplicationId: app.id,
                linkPath: "/applications",
              });
              if (!notifyResult.ok) {
                console.error("application_expired notification error:", notifyResult.error);
              }
            }
          }
        }
      }

      setListings((prev) =>
        prev.map((l) =>
          l.id === listingId ? { ...l, status: nextIsActive ? "active" : "inactive" } : l
        )
      );
      setActionMessage(nextIsActive ? "Internship resumed (published)." : "Internship paused (inactive).");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) return <p className="text-gray-600 transition-colors duration-300 dark:text-slate-400">Loading…</p>;
  if (listings.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        description="Create your first internship to start receiving applications."
        actionLabel="Create internship"
        actionHref="/company/internships/new"
      />
    );
  }

  return (
    <>
      {actionError ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div className="mb-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 transition-colors duration-300 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">
          {actionMessage}
        </div>
      ) : null}

      <Table headers={["Title", "Status", "Posted", "Applicants", "Actions"]}>
        {listings.map((i) => {
          const busy = actionLoadingId === i.id;
          const isActive = i.status === "active";
          return (
            <tr key={i.id} className="transition-colors duration-300 hover:bg-gray-50 dark:hover:bg-slate-800/60">
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">
                {i.title}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Badge variant={statusVariant[i.status] ?? "default"}>{i.status}</Badge>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                {i.created_at ? new Date(i.created_at).toLocaleDateString() : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
                {i.applicants_count ?? 0}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/company/internships/${i.id}/edit`}
                    className="text-gray-600 transition-colors duration-300 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white"
                  >
                    Edit
                  </Link>
                  <span className="text-gray-300 transition-colors duration-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setListingActive(i.id, !isActive)}
                    className="text-gray-600 transition-colors duration-300 hover:text-gray-900 disabled:opacity-60 dark:text-slate-300 dark:hover:text-white"
                  >
                    {busy ? "Updating..." : isActive ? "Pause" : "Resume"}
                  </button>
                  <span className="text-gray-300 transition-colors duration-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    disabled={busy || !isActive}
                    onClick={() => {
                      setConfirmCloseId(i.id);
                      setConfirmCloseOpen(true);
                    }}
                    className="text-gray-600 transition-colors duration-300 hover:text-gray-900 disabled:opacity-60 dark:text-slate-300 dark:hover:text-white"
                    title={!isActive ? "Already inactive" : "Close sets this listing inactive"}
                  >
                    Close
                  </button>
                  <span className="text-gray-300 transition-colors duration-300 dark:text-slate-600">|</span>
                  <Link
                    href={`/company/internships/${i.id}/applications`}
                    className="font-medium text-gray-900 transition-colors duration-300 hover:underline dark:text-white"
                  >
                    View Applicants
                  </Link>
                </span>
              </td>
            </tr>
          );
        })}
      </Table>

      <Modal
        isOpen={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="Close internship listing?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCloseOpen(false)} disabled={Boolean(confirmCloseId && actionLoadingId === confirmCloseId)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirmCloseId) return;
                void setListingActive(confirmCloseId, false).then(() => setConfirmCloseOpen(false));
              }}
              disabled={Boolean(confirmCloseId && actionLoadingId === confirmCloseId)}
            >
              {confirmCloseId && actionLoadingId === confirmCloseId ? "Closing..." : "Close listing"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700 transition-colors duration-300 dark:text-slate-300">
          Closing will set this listing to <span className="font-medium">inactive</span>. Students won’t see it in browse results anymore.
        </p>
      </Modal>
    </>
  );
}
