"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { CardGridSkeleton } from "@/components/loading";
import { Input, Select, Button, EmptyState, SearchBar } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { useI18n } from "@/lib/i18n/context";
import { formatMissingSkillsCount } from "@/lib/skill-match";
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

type RecommendationSkillGap = {
  matchedSkills: string[];
  missingSkills: string[];
  missingSkillsCount: number;
  hasDetectableInternshipSkills: boolean;
};

type RecommendedInternship = {
  internship_id: string;
  title: string;
  company_name: string;
  similarity_score: number;
  match_percentage: number;
  match_insights?: RecommendationMatchInsights;
  skill_gap?: RecommendationSkillGap;
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
  const { t } = useI18n();
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
            skill_gap?: RecommendationSkillGap;
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
              ...(row.skill_gap != null ? { skill_gap: row.skill_gap } : {}),
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

  type FilterKey = "location" | "skill" | "posted" | "company" | "companyLevel" | "match";

  const filterChipStyles: Record<
    FilterKey,
    { idle: string; active: string; dot: string }
  > = {
    location: {
      idle: "border-sky-200/80 bg-sky-50/80 text-sky-800 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20",
      active: "border-sky-400 bg-sky-100 text-sky-900 shadow-sm shadow-sky-200/60 dark:border-sky-400/50 dark:bg-sky-500/25 dark:text-sky-100 dark:shadow-sky-900/40",
      dot: "bg-sky-500",
    },
    skill: {
      idle: "border-emerald-200/80 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20",
      active: "border-emerald-400 bg-emerald-100 text-emerald-900 shadow-sm shadow-emerald-200/60 dark:border-emerald-400/50 dark:bg-emerald-500/25 dark:text-emerald-100",
      dot: "bg-emerald-500",
    },
    posted: {
      idle: "border-amber-200/80 bg-amber-50/80 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20",
      active: "border-amber-400 bg-amber-100 text-amber-900 shadow-sm shadow-amber-200/60 dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100",
      dot: "bg-amber-500",
    },
    company: {
      idle: "border-violet-200/80 bg-violet-50/80 text-violet-800 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20",
      active: "border-violet-400 bg-violet-100 text-violet-900 shadow-sm shadow-violet-200/60 dark:border-violet-400/50 dark:bg-violet-500/25 dark:text-violet-100",
      dot: "bg-violet-500",
    },
    companyLevel: {
      idle: "border-indigo-200/80 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
      active: "border-indigo-400 bg-indigo-100 text-indigo-900 shadow-sm shadow-indigo-200/60 dark:border-indigo-400/50 dark:bg-indigo-500/25 dark:text-indigo-100",
      dot: "bg-indigo-500",
    },
    match: {
      idle: "border-fuchsia-200/80 bg-fuchsia-50/80 text-fuchsia-800 hover:bg-fuchsia-100 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200 dark:hover:bg-fuchsia-500/20",
      active: "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-900 shadow-sm shadow-fuchsia-200/60 dark:border-fuchsia-400/50 dark:bg-fuchsia-500/25 dark:text-fuchsia-100",
      dot: "bg-fuchsia-500",
    },
  };

  const filterIsActive: Record<FilterKey, boolean> = {
    location: Boolean(locationType),
    skill: Boolean(skill),
    posted: Boolean(postedBefore),
    company: Boolean(companyId),
    companyLevel: Boolean(companyLevel),
    match: minMatchPct > 0,
  };

  const filterChipClass = (key: FilterKey, open: boolean) => {
    const styles = filterChipStyles[key];
    const active = filterIsActive[key] || open;
    return `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${
      active ? styles.active : styles.idle
    }`;
  };

  const drilldownPanelClass =
    "absolute left-0 top-[calc(100%+8px)] z-20 w-[min(320px,90vw)] rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-xl shadow-slate-200/40 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 dark:shadow-black/40";

  const matchScoreRingClass = (pct: number) => {
    if (pct >= 80) return "from-emerald-400 to-teal-500";
    if (pct >= 60) return "from-violet-400 to-fuchsia-500";
    if (pct >= 40) return "from-amber-400 to-orange-500";
    return "from-slate-400 to-slate-500";
  };

  return (
    <main className="pb-10 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="relative overflow-hidden border-b border-violet-200/40 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 dark:border-violet-500/20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <Container className="relative py-10 sm:py-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-100 backdrop-blur-sm">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              AI-powered matching
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Browse Internships</h1>
            <p className="mt-3 text-base text-violet-100/90 sm:text-lg">
              Discover roles tailored to your skills — filter by location, tech stack, company reputation, and more.
            </p>
          </div>
          {!loading && page === 0 ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-bold tabular-nums text-white">{cards.length}{hasMore ? "+" : ""}</p>
                <p className="text-xs font-medium text-violet-100/80">Open roles</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-bold tabular-nums text-white">{filteredRecommended.length}</p>
                <p className="text-xs font-medium text-violet-100/80">Recommended for you</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-bold tabular-nums text-white">{companyOptions.length - 1}</p>
                <p className="text-xs font-medium text-violet-100/80">Companies hiring</p>
              </div>
            </div>
          ) : null}
        </Container>
      </div>

      <Container className="-mt-6 pt-2">
        <section className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/40 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30 sm:p-5">
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

          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Smart filters
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                className={filterChipClass("location", openDrilldown === "location")}
                onClick={() => setOpenDrilldown((v) => (v === "location" ? null : "location"))}
              >
                {filterIsActive.location ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.location.dot}`} />
                ) : null}
                Location
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
                className={filterChipClass("skill", openDrilldown === "skill")}
                onClick={() => setOpenDrilldown((v) => (v === "skill" ? null : "skill"))}
              >
                {filterIsActive.skill ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.skill.dot}`} />
                ) : null}
                Skill
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
                className={filterChipClass("posted", openDrilldown === "posted")}
                onClick={() => setOpenDrilldown((v) => (v === "posted" ? null : "posted"))}
              >
                {filterIsActive.posted ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.posted.dot}`} />
                ) : null}
                Posted before
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
                className={filterChipClass("company", openDrilldown === "company")}
                onClick={() => setOpenDrilldown((v) => (v === "company" ? null : "company"))}
              >
                {filterIsActive.company ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.company.dot}`} />
                ) : null}
                Company
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
                className={filterChipClass("companyLevel", openDrilldown === "companyLevel")}
                onClick={() => setOpenDrilldown((v) => (v === "companyLevel" ? null : "companyLevel"))}
              >
                {filterIsActive.companyLevel ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.companyLevel.dot}`} />
                ) : null}
                Company level
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
                className={filterChipClass("match", openDrilldown === "match")}
                onClick={() => setOpenDrilldown((v) => (v === "match" ? null : "match"))}
              >
                {filterIsActive.match ? (
                  <span className={`h-2 w-2 rounded-full ${filterChipStyles.match.dot}`} />
                ) : null}
                Min match{minMatchPct > 0 ? ` · ${minMatchPct}%` : ""}
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
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-fuchsia-200 via-violet-300 to-indigo-300 accent-violet-600 dark:from-fuchsia-900/50 dark:via-violet-800/50 dark:to-indigo-800/50"
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
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-md shadow-violet-100/50 transition-colors duration-300 dark:border-violet-500/20 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/30 dark:shadow-black/20">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-300/30 blur-2xl dark:bg-violet-500/10" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-300/50 dark:shadow-violet-900/40">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M11.3 1.046a1 1 0 011.414 0l1.544 1.544a1 1 0 01.293.707V5.5a1 1 0 001 1h2.203a1 1 0 01.707.293l1.544 1.544a1 1 0 010 1.414l-1.544 1.544a1 1 0 01-.707.293H15.5a1 1 0 00-1 1v2.203a1 1 0 01-.293.707l-1.544 1.544a1 1 0 01-1.414 0l-1.544-1.544a1 1 0 01-.293-.707V15.5a1 1 0 00-1-1h-2.203a1 1 0 01-.707-.293l-1.544-1.544a1 1 0 010-1.414l1.544-1.544a1 1 0 01.707-.293H5.5a1 1 0 001-1V8.544a1 1 0 01.293-.707l1.544-1.544zM10 13a3 3 0 100-6 3 3 0 000 6z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recommended for you</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Matched to your profile, skills, and preferences
                  </p>
                </div>
              </div>
            </div>
            {filteredRecommended.length > 0 ? (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                {filteredRecommended.length} pick{filteredRecommended.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          {recommendedLoading ? (
            <CardGridSkeleton count={2} variant="internship" columns="sm:grid-cols-2" className="relative mt-5" />
          ) : filteredRecommended.length === 0 ? (
            <div className="relative mt-5 rounded-xl border border-dashed border-violet-300/60 bg-white/70 px-4 py-6 text-sm text-slate-600 dark:border-violet-500/30 dark:bg-slate-900/50 dark:text-slate-300">
              {recommendedMessage ??
                (minMatchPct > 0
                  ? "No recommendations match your minimum match filter."
                  : "No recommendations available yet.")}
            </div>
          ) : (
            <div className="relative mt-5 grid gap-4 sm:grid-cols-2">
              {filteredRecommended.map((item) => {
                const appStatus = studentApplicationByPositionId[item.internship_id];
                const matchPct = Math.max(0, Math.min(100, Math.round(item.match_percentage)));
                const ringClass = matchScoreRingClass(matchPct);
                return (
                  <div
                    key={item.internship_id}
                    className="group relative overflow-hidden rounded-2xl border border-violet-200/70 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-200/40 dark:border-violet-500/25 dark:bg-slate-900/80 dark:hover:border-violet-400/40 dark:hover:shadow-violet-900/30"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400" />
                    <div className="flex items-start justify-between gap-3 pt-1">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-300">
                          {item.title}
                        </h3>
                        <p className="mt-1 truncate text-xs font-medium text-violet-700/80 dark:text-violet-300/90">
                          {item.company_name}
                        </p>
                      </div>
                      <div
                        className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br ${ringClass} p-0.5 shadow-md`}
                        title={`${matchPct}% profile match`}
                      >
                        <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{matchPct}%</span>
                          <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            match
                          </span>
                        </div>
                      </div>
                    </div>

                    {(appStatus || item.skill_gap?.hasDetectableInternshipSkills) ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {appStatus ? (
                          <span
                            className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${recommendedApplicationBadgeClass(appStatus)}`}
                            title={recommendedApplicationLabel(appStatus)}
                          >
                            {recommendedApplicationLabel(appStatus)}
                          </span>
                        ) : null}
                        {item.skill_gap?.hasDetectableInternshipSkills
                          ? (() => {
                              const missingCount = item.skill_gap?.missingSkillsCount ?? 0;
                              const strongMatch = missingCount <= 0;
                              return (
                                <span
                                  className={`inline-flex max-w-full items-center gap-1 truncate rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                    strongMatch
                                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/25 dark:text-emerald-200"
                                      : "bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200"
                                  }`}
                                >
                                  {strongMatch ? (
                                    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                      <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  )}
                                  {formatMissingSkillsCount(missingCount, t)}
                                </span>
                              );
                            })()
                          : null}
                      </div>
                    ) : null}
                    {(() => {
                      const mi = item.match_insights;
                      const summaryFirst = mi?.summary_lines?.[0]?.trim() ?? "";
                      const matchedShow = (
                        item.skill_gap?.matchedSkills ??
                        mi?.matched_skills ??
                        []
                      ).slice(0, 3);
                      const gapsShow = (item.skill_gap?.missingSkills ?? []).slice(0, 2);
                      const hasInsightsBlock =
                        mi != null &&
                        (summaryFirst.length > 0 || matchedShow.length > 0 || gapsShow.length > 0);
                      if (!hasInsightsBlock) return null;
                      return (
                        <div className="mt-3 rounded-xl bg-violet-50/80 p-3 dark:bg-violet-500/10">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                            AI match insights
                          </p>
                          {summaryFirst.length > 0 && (
                            <p className="mt-1 text-[11px] leading-snug text-slate-700 dark:text-slate-300">
                              {summaryFirst}
                            </p>
                          )}
                          {matchedShow.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {matchedShow.map((s) => (
                                <span
                                  key={`m:${s}`}
                                  className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                                >
                                  ✓ {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {gapsShow.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {gapsShow.map((g) => (
                                <span
                                  key={`g:${g}`}
                                  className="rounded-full border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-300/40 transition-all hover:from-violet-700 hover:to-fuchsia-700 hover:shadow-lg dark:shadow-violet-900/40"
                    >
                      View internship
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All internships</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {loading && page === 0 ? "Loading listings…" : "Browse every open role on the platform"}
            </p>
          </div>
          {!loading || page > 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {cards.length} shown{hasMore ? "+" : ""}
            </span>
          ) : null}
        </div>
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
              <div className="grid gap-5 sm:grid-cols-2">
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
              <div className="mt-8 flex justify-center">
                {hasMore ? (
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                    className="min-w-44 rounded-full border-violet-200 bg-white px-6 shadow-sm hover:border-violet-300 hover:bg-violet-50 dark:border-violet-500/30 dark:bg-slate-900 dark:hover:bg-violet-500/10"
                  >
                    {loading ? "Loading..." : "Load more internships"}
                  </Button>
                ) : (
                  <p className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    You’ve reached the end
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
