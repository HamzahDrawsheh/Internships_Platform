"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dispatchNotification } from "@/lib/notifications/client";
import { createClient } from "@/lib/supabase/client";
import EmptyState from "@/components/common/EmptyState";
import { CardGridSkeleton } from "@/components/loading";
import { Modal, Button, StatusText } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";

type FilterKey = "all" | "active" | "paused";

type ListingRow = {
  id: string;
  company_id: string;
  title: string;
  status: string;
  created_at?: string;
  applicants_count?: number;
};

function formatPostedDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CompanyInternshipsList() {
  const { t } = useI18n();
  const H = "dashboard.company.internships";
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
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

  const stats = useMemo(() => {
    const active = listings.filter((l) => l.status === "active").length;
    const applicants = listings.reduce((sum, l) => sum + (l.applicants_count ?? 0), 0);
    return { total: listings.length, active, paused: listings.length - active, applicants };
  }, [listings]);

  const visibleListings = useMemo(() => {
    if (filter === "active") return listings.filter((l) => l.status === "active");
    if (filter === "paused") return listings.filter((l) => l.status !== "active");
    return listings;
  }, [listings, filter]);

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

  const filterOptions: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "active", label: "Active", count: stats.active },
    { key: "paused", label: "Paused", count: stats.paused },
  ];

  if (loading) {
    return (
      <>
        <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <CardGridSkeleton count={3} variant="internship" columns="sm:grid-cols-2" className="mt-6" />
      </>
    );
  }

  if (listings.length === 0) {
    return (
      <>
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-lg dark:border-indigo-500/20">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative px-5 py-5 sm:px-6 sm:py-7">
            <div className="max-w-xl">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{t(`${H}.title`)}</h1>
              <p className="mt-2 text-sm text-indigo-100/90 sm:text-base">{t(`${H}.heroSubtitleEmpty`)}</p>
              <Link
                href="/company/internships/new"
                className="mt-4 inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50"
              >
                {t(`${H}.createInternship`)}
              </Link>
            </div>
          </div>
        </section>
        <div className="mt-6">
          <EmptyState
            title="No listings yet"
            description="Create your first internship to start receiving applications."
            actionLabel="Create internship"
            actionHref="/company/internships/new"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-indigo-200/50 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 shadow-lg dark:border-indigo-500/20">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative px-5 py-5 sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch sm:justify-between sm:gap-6">
            <div className="max-w-xl sm:flex sm:flex-col sm:justify-center">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{t(`${H}.title`)}</h1>
              <p className="mt-2 text-sm text-indigo-100/90 sm:text-base">{t(`${H}.heroSubtitle`)}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-4 sm:items-end sm:justify-center">
              <Link
                href="/company/internships/new"
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-md transition hover:bg-indigo-50"
              >
                + {t(`${H}.createInternship`)}
              </Link>
              <div className="flex flex-wrap gap-3 sm:flex-nowrap sm:justify-end sm:self-stretch">
                <div className="flex min-w-[6.75rem] flex-1 flex-col justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm sm:min-w-[7.5rem]">
                  <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{stats.total}</p>
                  <p className="mt-1 text-sm font-medium leading-snug text-indigo-100/80">{t(`${H}.statsTotalPosts`)}</p>
                </div>
                <div className="flex min-w-[6.75rem] flex-1 flex-col justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm sm:min-w-[7.5rem]">
                  <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{stats.active}</p>
                  <p className="mt-1 text-sm font-medium leading-snug text-indigo-100/80">{t(`${H}.statsActive`)}</p>
                </div>
                <div className="flex min-w-[6.75rem] flex-1 flex-col justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm sm:min-w-[7.5rem]">
                  <p className="text-2xl font-bold tabular-nums text-white sm:text-3xl">{stats.applicants}</p>
                  <p className="mt-1 text-sm font-medium leading-snug text-indigo-100/80">{t(`${H}.statsApplicants`)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {actionError ? (
        <div
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          role="alert"
        >
          {actionError}
        </div>
      ) : null}
      {actionMessage ? (
        <div
          className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          role="status"
        >
          {actionMessage}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((opt) => {
              const isActive = filter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setFilter(opt.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {opt.label}
                  <span className="ms-1.5 tabular-nums opacity-80">({opt.count})</span>
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {visibleListings.length} listing{visibleListings.length === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      {visibleListings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <p className="text-sm text-slate-600 dark:text-slate-400">No {filter === "paused" ? "paused" : filter} listings.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {visibleListings.map((listing) => {
            const busy = actionLoadingId === listing.id;
            const isActive = listing.status === "active";
            const applicants = listing.applicants_count ?? 0;

            return (
              <article
                key={listing.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/30"
              >
                <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">
                      {listing.title}
                    </h2>
                    <StatusText variant={isActive ? "success" : "default"}>
                      {isActive ? "Active" : "Paused"}
                    </StatusText>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Posted</dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">
                        {formatPostedDate(listing.created_at)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Applicants</dt>
                      <dd className="mt-0.5 font-medium tabular-nums text-slate-900 dark:text-white">{applicants}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                    <Link
                      href={`/company/internships/${listing.id}/applications`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#7C3AED] px-3 py-2 text-sm font-medium text-white shadow-md transition hover:bg-[#6D28D9] sm:flex-none"
                    >
                      View applicants
                    </Link>
                    <Link
                      href={`/company/internships/${listing.id}/edit`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void setListingActive(listing.id, !isActive)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {busy ? "…" : isActive ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      disabled={busy || !isActive}
                      onClick={() => {
                        setConfirmCloseId(listing.id);
                        setConfirmCloseOpen(true);
                      }}
                      className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                      title={!isActive ? "Already inactive" : "Close sets this listing inactive"}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        title="Close internship listing?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmCloseOpen(false)}
              disabled={Boolean(confirmCloseId && actionLoadingId === confirmCloseId)}
            >
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
          Closing will set this listing to <span className="font-medium">inactive</span>. Students won’t see it in browse
          results anymore.
        </p>
      </Modal>
    </>
  );
}
