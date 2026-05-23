"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardGridSkeleton } from "@/components/loading";
import { Input, Select, Button, EmptyState, SearchBar } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { createClient } from "@/lib/supabase/client";
import type { ApplicationStatus } from "@/lib/types";
import { InternshipCard } from "@/components/internships/InternshipCard";

/** When `"true"`, recommendations load via `/api/recommendations/internships` only (no `supabase.rpc`). Safe for staging before DB RPC exists. */
function internshipRecommendationsApiOnly(): boolean {
  return process.env.NEXT_PUBLIC_INTERN_RECOMMENDATIONS_SKIP_RPC === "true";
}

/** Present on `/api/recommendations/internships` rows; omitted when loading via RPC fallback. */
type RecommendationMatchInsights = {
  matched_skills: string[];
  gaps: string[];
  summary_lines: string[];
  tips: string[];
};

type RecommendedInternship = {
  internship_id: string;
  title: string;
  company_name: string;
  similarity_score: number;
  match_percentage: number;
  match_insights?: RecommendationMatchInsights;
};

const locationOptions: SelectOption[] = [
  { value: "", label: "All locations" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

const skillOptions: SelectOption[] = [
  { value: "", label: "Any skill" },
  { value: "Python", label: "Python" },
  { value: "Machine Learning", label: "Machine Learning" },
  { value: "SQL", label: "SQL" },
  { value: "NLP", label: "NLP" },
  { value: "Data Visualization", label: "Data Visualization" },
];

export default function BrowseInternshipsPage() {
  const [search, setSearch] = useState("");
  const [locationType, setLocationType] = useState("");
  const [skill, setSkill] = useState("");
  const [postedBefore, setPostedBefore] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companyLevel, setCompanyLevel] = useState<"" | "white" | "gray" | "black">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [minMatchPct, setMinMatchPct] = useState(0);
  const [openDrilldown, setOpenDrilldown] = useState<
    "location" | "skill" | "posted" | "company" | "companyLevel" | "match" | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [rows, setRows] = useState<
    {
      id: string;
      title: string;
      location: string | null;
      requirements: string | null;
      created_at: string;
      company_id: string;
      company_name?: string;
      company_logo_url?: string | null;
    }[]
  >([]);
  const [recommended, setRecommended] = useState<RecommendedInternship[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedMessage, setRecommendedMessage] = useState<string | null>(null);
  const [companyOptions, setCompanyOptions] = useState<SelectOption[]>([
    { value: "", label: "All companies" },
  ]);
  /** Map internship position id → application status for signed-in student */
  const [studentApplicationByPositionId, setStudentApplicationByPositionId] = useState<
    Record<string, ApplicationStatus>
  >({});

  const clearFilters = () => {
    setSearch("");
    setLocationType("");
    setSkill("");
    setPostedBefore("");
    setCompanyId("");
    setCompanyLevel("");
    setSort("newest");
    setMinMatchPct(0);
    setOpenDrilldown(null);
  };

  // Reset paging when filters change.
  useEffect(() => {
    setPage(0);
  }, [search, locationType, skill, postedBefore, companyId, companyLevel, sort]);

  useEffect(() => {
    const supabase = createClient();

    const loadStudentApplications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStudentApplicationByPositionId({});
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "student") {
        setStudentApplicationByPositionId({});
        return;
      }

      const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!student?.id) {
        setStudentApplicationByPositionId({});
        return;
      }

      await invokeAutoCompleteExpiredTrainings(supabase);

      const { data: apps } = await supabase
        .from("applications")
        .select("position_id, status")
        .eq("student_id", student.id);

      const next: Record<string, ApplicationStatus> = {};
      for (const row of apps ?? []) {
        const pid = row.position_id as string;
        const st = row.status as ApplicationStatus;
        if (pid) next[pid] = st;
      }
      setStudentApplicationByPositionId(next);
    };

    void loadStudentApplications();

    const onVisible = () => {
      if (document.visibilityState === "visible") void loadStudentApplications();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setRecommendedLoading(true);
      setRecommendedMessage(null);
      if (page === 0) setHasMore(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setRecommended([]);
        setRecommendedLoading(false);
        setRecommendedMessage("Sign in as a student to see AI-powered recommendations.");
      } else {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id, embedding")
          .eq("user_id", user.id)
          .single();

        if (!studentRow) {
          setRecommended([]);
          setRecommendedLoading(false);
          setRecommendedMessage("Complete your student onboarding to unlock recommendations.");
        } else if (!studentRow.embedding) {
          setRecommended([]);
          setRecommendedLoading(false);
          setRecommendedMessage(
            "We are preparing your recommendations. Please complete your profile details and try again soon."
          );
        } else {
          const limit = 6;

          /** Raw row from API (may include match_insights) or RPC (usually omits it). */
          type RecRow = {
            internship_id: string;
            title: string;
            company_name: string;
            similarity_score: unknown;
            match_percentage: unknown;
            match_insights?: RecommendationMatchInsights;
          };

          let rawRows: RecRow[] = [];
          let hardFailure = false;

          const fetchRecommendationsFromApi = async (): Promise<RecRow[] | null> => {
            const res = await fetch(`/api/recommendations/internships?limit=${limit}`, {
              credentials: "same-origin",
            });
            if (!res.ok) {
              return null;
            }
            const body = (await res.json()) as { ok?: boolean; recommendations?: RecRow[] };
            if (body.ok && Array.isArray(body.recommendations)) {
              return body.recommendations;
            }
            return null;
          };

          // Prefer HTTP API first so match_insights is populated; RPC remains fallback only.
          const apiRows = await fetchRecommendationsFromApi();
          if (apiRows !== null) {
            rawRows = apiRows;
          } else if (internshipRecommendationsApiOnly()) {
            hardFailure = true;
          } else {
            const rpcResult = await supabase.rpc("get_student_recommended_internships", {
              p_student_id: studentRow.id,
              p_limit: limit,
            });

            rawRows = Array.isArray(rpcResult.data) ? (rpcResult.data as RecRow[]) : [];

            if (rpcResult.error) {
              console.warn("[internships] RPC recommendations failed, retrying API:", rpcResult.error.message);
              hardFailure = true;
              const retryApi = await fetchRecommendationsFromApi();
              if (retryApi !== null) {
                rawRows = retryApi;
                hardFailure = false;
              }
            }
          }

          setRecommended(
            rawRows.map((row) => ({
              internship_id: row.internship_id,
              title: row.title,
              company_name: row.company_name,
              similarity_score: Number(row.similarity_score ?? 0),
              match_percentage: Number(row.match_percentage ?? 0),
              ...(row.match_insights != null ? { match_insights: row.match_insights } : {}),
            }))
          );

          if (rawRows.length === 0) {
            setRecommendedMessage(
              hardFailure
                ? "Unable to load recommendations right now. Please try again later."
                : "No recommendations available yet. New matches will appear as internships are posted."
            );
          } else {
            setRecommendedMessage(null);
          }
          setRecommendedLoading(false);
        }
      }

      let query = supabase
        .from("internship_positions")
        .select("id, title, location, requirements, created_at, company_id")
        .eq("is_active", true)
        .order("created_at", { ascending: sort === "oldest" });

      if (search.trim()) {
        query = query.ilike("title", `%${search.trim()}%`);
      }
      if (locationType) {
        query = query.ilike("location", `%${locationType}%`);
      }
      if (skill) {
        query = query.ilike("requirements", `%${skill}%`);
      }
      if (postedBefore) {
        query = query.lte("created_at", `${postedBefore}T23:59:59`);
      }
      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data: positions } = await query.range(from, to);
      const baseRows = positions ?? [];
      const companyIds = [...new Set(baseRows.map((row) => row.company_id))];

      const { data: companies } = companyIds.length
        ? await supabase.from("companies").select("id, company_name, logo_url").in("id", companyIds)
        : { data: [] as { id: string; company_name: string; logo_url: string | null }[] };
      const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));
      const companyLogoById = new Map((companies ?? []).map((c) => [c.id, c.logo_url]));

      // Optional: load company evaluation "level" (white/gray/black) for drill-down filtering.
      const companyLevelById = new Map<string, "" | "white" | "gray" | "black">();
      if (companyIds.length) {
        const results = await Promise.all(
          companyIds.slice(0, 40).map(async (cid) => {
            const r = await supabase.rpc("get_company_evaluation", { p_company_id: cid });
            const d = r.data as { company_level?: unknown } | null;
            const level = typeof d?.company_level === "string" ? d.company_level : "";
            if (level === "white" || level === "gray" || level === "black") {
              return [cid, level] as const;
            }
            return [cid, ""] as const;
          })
        );
        for (const [cid, level] of results) {
          companyLevelById.set(cid, level);
        }
      }

      const mappedAll = baseRows.map((row) => ({
        ...row,
        company_name: companyNameById.get(row.company_id),
        company_logo_url: companyLogoById.get(row.company_id) ?? null,
        company_level: companyLevelById.get(row.company_id) ?? "",
      }));

      const mapped =
        companyLevel && (companyLevel === "white" || companyLevel === "gray" || companyLevel === "black")
          ? mappedAll.filter((r) => r.company_level === companyLevel)
          : mappedAll;

      if (page === 0) {
        setRows(mapped);
      } else {
        setRows((prev) => [...prev, ...mapped]);
      }

      setHasMore(mapped.length === pageSize);

      // Build company options from current results for a lightweight drill-down.
      const merged = new Map<string, string>();
      for (const r of page === 0 ? mapped : [...rows, ...mapped]) {
        merged.set(r.company_id, r.company_name ?? "Company");
      }
      const opts: SelectOption[] = [{ value: "", label: "All companies" }];
      for (const [id, name] of [...merged.entries()].sort((a, b) => a[1].localeCompare(b[1]))) {
        opts.push({ value: id, label: name });
      }
      setCompanyOptions(opts);
      setLoading(false);
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rows is intentionally excluded to avoid reload loops
  }, [search, locationType, skill, postedBefore, companyId, sort, page]);

  const cards = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        companyName: row.company_name ?? "Company",
        companyLogoUrl: row.company_logo_url ?? undefined,
        locationType: row.location ?? undefined,
        skills: row.requirements
          ? row.requirements
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        deadline: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
        applicationStatus: studentApplicationByPositionId[row.id] ?? null,
      })),
    [rows, studentApplicationByPositionId]
  );

  const recommendedApplicationBadgeClass = (status: ApplicationStatus): string => {
    switch (status) {
      case "pending":
        return "bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200";
      case "accepted":
        return "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200";
      case "rejected":
        return "bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-200";
      case "completed":
        return "bg-blue-100 text-blue-900 dark:bg-blue-500/25 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200";
    }
  };

  const recommendedApplicationLabel = (status: ApplicationStatus): string => {
    switch (status) {
      case "pending":
        return "Applied · Pending";
      case "accepted":
        return "Applied · Accepted";
      case "rejected":
        return "Applied · Rejected";
      case "completed":
        return "Applied · Completed";
      default:
        return "Applied";
    }
  };

  const filteredRecommended = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, minMatchPct));
    if (clamped <= 0) return recommended;
    return recommended.filter((r) => (Number(r.match_percentage) || 0) >= clamped);
  }, [recommended, minMatchPct]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    Boolean(locationType) ||
    Boolean(skill) ||
    Boolean(postedBefore) ||
    Boolean(companyId) ||
    Boolean(companyLevel) ||
    sort !== "newest" ||
    minMatchPct > 0;

  const drilldownButtonClass =
    "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:focus-visible:ring-offset-gray-950";

  const drilldownPanelClass =
    "absolute left-0 top-[calc(100%+8px)] z-20 w-[min(320px,90vw)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900";

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Browse Internships"
          description="Filter by location, skills, company, and posted date."
        />

        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <SearchBar
                value={search}
                onChange={setSearch}
                placeholder="Search by title, company, or skills…"
              />
            </div>
            <div className="w-full lg:w-56">
              <Select
                label="Sort by"
                options={[
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                ]}
                value={sort}
                onChange={(e) =>
                  setSort((e.target.value === "oldest" ? "oldest" : "newest") as "newest" | "oldest")
                }
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "location" ? null : "location"))}
              >
                Location
                <span className="text-xs opacity-70">{locationType ? "•" : ""}</span>
              </button>
              {openDrilldown === "location" ? (
                <div className={drilldownPanelClass}>
                  <Select
                    label="Location type"
                    options={locationOptions}
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "skill" ? null : "skill"))}
              >
                Skill
                <span className="text-xs opacity-70">{skill ? "•" : ""}</span>
              </button>
              {openDrilldown === "skill" ? (
                <div className={drilldownPanelClass}>
                  <Select
                    label="Skill"
                    options={skillOptions}
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "posted" ? null : "posted"))}
              >
                Posted before
                <span className="text-xs opacity-70">{postedBefore ? "•" : ""}</span>
              </button>
              {openDrilldown === "posted" ? (
                <div className={drilldownPanelClass}>
                  <Input
                    label="Posted before"
                    type="date"
                    value={postedBefore}
                    onChange={(e) => setPostedBefore(e.target.value)}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Note: this filters by posting date (not a deadline).
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "company" ? null : "company"))}
              >
                Company
                <span className="text-xs opacity-70">{companyId ? "•" : ""}</span>
              </button>
              {openDrilldown === "company" ? (
                <div className={drilldownPanelClass}>
                  <Select
                    label="Company"
                    options={companyOptions}
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "companyLevel" ? null : "companyLevel"))}
              >
                Company level
                <span className="text-xs opacity-70">{companyLevel ? "•" : ""}</span>
              </button>
              {openDrilldown === "companyLevel" ? (
                <div className={drilldownPanelClass}>
                  <Select
                    label="Company level"
                    options={[
                      { value: "", label: "Any level" },
                      { value: "white", label: "White" },
                      { value: "gray", label: "Gray" },
                      { value: "black", label: "Black" },
                    ]}
                    value={companyLevel}
                    onChange={(e) =>
                      setCompanyLevel((e.target.value as "" | "white" | "gray" | "black") || "")
                    }
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    Company level comes from aggregated student training evaluations.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="relative">
              <button
                type="button"
                className={drilldownButtonClass}
                onClick={() => setOpenDrilldown((v) => (v === "match" ? null : "match"))}
              >
                Min match
                <span className="text-xs opacity-70">{minMatchPct > 0 ? `• ${minMatchPct}%` : ""}</span>
              </button>
              {openDrilldown === "match" ? (
                <div className={drilldownPanelClass}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Minimum match (recommendations)
                  </label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={minMatchPct}
                      onChange={(e) => setMinMatchPct(Number(e.target.value))}
                      className="w-full"
                      aria-label="Minimum match percentage"
                    />
                    <span className="w-12 text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {minMatchPct}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                    This only filters the recommended section (match % isn’t available for all listings).
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <p className="text-slate-600 dark:text-slate-400">
              {loading && page === 0
                ? "Loading internships…"
                : `${cards.length} internship${cards.length === 1 ? "" : "s"} shown${hasMore ? "+" : ""}`}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="font-medium text-violet-700 transition-colors hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </section>
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-gray-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
                Recommended Internships
              </h2>
              <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-300">
                Recommended based on your profile, skills, and preferences.
              </p>
            </div>
          </div>

          {recommendedLoading ? (
            <CardGridSkeleton count={2} variant="internship" columns="sm:grid-cols-2" className="mt-4" />
          ) : filteredRecommended.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
              {recommendedMessage ??
                (minMatchPct > 0
                  ? "No recommendations match your minimum match filter."
                  : "No recommendations available yet.")}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {filteredRecommended.map((item) => {
                const appStatus = studentApplicationByPositionId[item.internship_id];
                return (
                <div
                  key={item.internship_id}
                  className="rounded-xl border border-purple-100 bg-purple-50/40 p-4 transition-colors duration-300 dark:border-purple-400/20 dark:bg-purple-500/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{item.company_name}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      {appStatus ? (
                        <span
                          className={`max-w-[10.5rem] truncate rounded-full px-2 py-0.5 text-center text-[10px] font-semibold ${recommendedApplicationBadgeClass(appStatus)}`}
                          title={recommendedApplicationLabel(appStatus)}
                        >
                          {recommendedApplicationLabel(appStatus)}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                        {Math.max(0, Math.min(100, Math.round(item.match_percentage)))}% match
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    Recommended based on your profile, skills, and preferences.
                  </p>
                  {(() => {
                    const mi = item.match_insights;
                    const summaryFirst = mi?.summary_lines?.[0]?.trim() ?? "";
                    const matchedShow = (mi?.matched_skills ?? []).slice(0, 3);
                    const gapsShow = (mi?.gaps ?? []).slice(0, 2);
                    const hasInsightsBlock =
                      mi != null &&
                      (summaryFirst.length > 0 || matchedShow.length > 0 || gapsShow.length > 0);
                    if (!hasInsightsBlock) return null;
                    return (
                      <div className="mt-3 border-t border-purple-200/70 pt-2.5 dark:border-purple-500/25">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-800 dark:text-purple-200/90">
                          AI Match Insights
                        </p>
                        {summaryFirst.length > 0 && (
                          <p className="mt-1 text-[11px] leading-snug text-gray-700 dark:text-slate-300">
                            {summaryFirst}
                          </p>
                        )}
                        {matchedShow.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {matchedShow.map((s) => (
                              <span
                                key={`m:${s}`}
                                className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-900 dark:bg-purple-500/25 dark:text-purple-100"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {gapsShow.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {gapsShow.map((g) => (
                              <span
                                key={`g:${g}`}
                                className="rounded-full border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[10px] font-normal text-slate-600 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-400"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <Link
                    href={`/internships/${item.internship_id}`}
                    className="mt-3 inline-flex items-center rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 transition-all duration-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-purple-400/40 dark:text-purple-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200 dark:focus-visible:ring-offset-gray-900"
                  >
                    View internship
                  </Link>
                </div>
                );
              })}
            </div>
          )}
        </section>
        <div className="min-w-0">
          {loading && page === 0 ? (
            <CardGridSkeleton variant="internship" columns="sm:grid-cols-2" />
          ) : cards.length === 0 ? (
            <EmptyState
              title="No internships found."
              description="Try changing your filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((card) => (
                  <InternshipCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    companyName={card.companyName}
                    companyLogoUrl={card.companyLogoUrl}
                    locationType={card.locationType}
                    skills={card.skills}
                    deadline={card.deadline}
                    applicationStatus={card.applicationStatus ?? undefined}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                {hasMore ? (
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    className="min-w-40"
                  >
                    {loading ? "Loading..." : "Load more"}
                  </Button>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-400">You’ve reached the end.</p>
                )}
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
