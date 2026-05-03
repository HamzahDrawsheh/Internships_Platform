"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Button, EmptyState } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { InternshipCard } from "@/components/internships/InternshipCard";

/** When `"true"`, recommendations load via `/api/recommendations/internships` only (no `supabase.rpc`). Safe for staging before DB RPC exists. */
function internshipRecommendationsApiOnly(): boolean {
  return process.env.NEXT_PUBLIC_INTERN_RECOMMENDATIONS_SKIP_RPC === "true";
}

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
  const [deadlineBefore, setDeadlineBefore] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    {
      id: string;
      title: string;
      location: string | null;
      requirements: string | null;
      created_at: string;
      company_id: string;
      company_name?: string;
    }[]
  >([]);
  const [recommended, setRecommended] = useState<
    {
      internship_id: string;
      title: string;
      company_name: string;
      similarity_score: number;
      match_percentage: number;
    }[]
  >([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);
  const [recommendedMessage, setRecommendedMessage] = useState<string | null>(null);

  const clearFilters = () => {
    setSearch("");
    setLocationType("");
    setSkill("");
    setDeadlineBefore("");
  };

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setRecommendedLoading(true);
      setRecommendedMessage(null);

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
          type RecRow = {
            internship_id: string;
            title: string;
            company_name: string;
            similarity_score: unknown;
            match_percentage: unknown;
          };

          let rawRows: RecRow[] = [];
          let hardFailure = false;

          const fetchRecommendationsFromApi = async (): Promise<boolean> => {
            const res = await fetch(`/api/recommendations/internships?limit=${limit}`, {
              credentials: "same-origin",
            });
            if (!res.ok) {
              return false;
            }
            const body = (await res.json()) as { ok?: boolean; recommendations?: RecRow[] };
            if (body.ok && Array.isArray(body.recommendations)) {
              rawRows = body.recommendations;
              return true;
            }
            return false;
          };

          if (internshipRecommendationsApiOnly()) {
            hardFailure = !(await fetchRecommendationsFromApi());
          } else {
            const rpcResult = await supabase.rpc("get_student_recommended_internships", {
              p_student_id: studentRow.id,
              p_limit: limit,
            });

            rawRows = Array.isArray(rpcResult.data) ? (rpcResult.data as RecRow[]) : [];

            if (rpcResult.error) {
              console.warn("[internships] RPC recommendations failed, using API fallback:", rpcResult.error.message);
              hardFailure = true;
              if (await fetchRecommendationsFromApi()) {
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
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("title", `%${search.trim()}%`);
      }
      if (locationType) {
        query = query.ilike("location", `%${locationType}%`);
      }
      if (skill) {
        query = query.ilike("requirements", `%${skill}%`);
      }
      if (deadlineBefore) {
        query = query.lte("created_at", `${deadlineBefore}T23:59:59`);
      }

      const { data: positions } = await query;
      const baseRows = positions ?? [];
      const companyIds = [...new Set(baseRows.map((row) => row.company_id))];

      const { data: companies } = companyIds.length
        ? await supabase.from("companies").select("id, company_name").in("id", companyIds)
        : { data: [] as { id: string; company_name: string }[] };
      const companyNameById = new Map((companies ?? []).map((c) => [c.id, c.company_name]));

      setRows(
        baseRows.map((row) => ({
          ...row,
          company_name: companyNameById.get(row.company_id),
        }))
      );
      setLoading(false);
    };

    load();
  }, [search, locationType, skill, deadlineBefore]);

  const cards = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        companyName: row.company_name ?? "Company",
        locationType: row.location ?? undefined,
        skills: row.requirements
          ? row.requirements
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        deadline: row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined,
      })),
    [rows]
  );

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container>
        <PageHeader
          title="Browse Internships"
          description="Filter by location, skills, and posted date."
        />
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
            <p className="mt-4 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
              Loading recommendations...
            </p>
          ) : recommended.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-600 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
              {recommendedMessage ?? "No recommendations available yet."}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {recommended.map((item) => (
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
                    <span className="shrink-0 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                      {Math.max(0, Math.min(100, Math.round(item.match_percentage)))}% match
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    Recommended based on your profile, skills, and preferences.
                  </p>
                  <Link
                    href={`/internships/${item.internship_id}`}
                    className="mt-3 inline-flex items-center rounded-lg border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 transition-all duration-300 hover:bg-purple-50 hover:text-purple-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:border-purple-400/40 dark:text-purple-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200 dark:focus-visible:ring-offset-gray-900"
                  >
                    View internship
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white lg:w-64">
            <h3 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Filters</h3>
            <Input
              label="Search"
              placeholder="Title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
            />
            <Select
              label="Location type"
              options={locationOptions}
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <Select
              label="Skill"
              options={skillOptions}
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <Input
              label="Deadline before"
              type="date"
              value={deadlineBefore}
              onChange={(e) => setDeadlineBefore(e.target.value)}
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400"
            />
            <Button
              variant="secondary"
              onClick={clearFilters}
              className="w-full transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              Clear filters
            </Button>
          </aside>
          <div className="min-w-0 flex-1">
            {loading ? (
              <p className="text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">Loading internships...</p>
            ) : cards.length === 0 ? (
              <EmptyState
                title="No internships available yet."
                description="Try changing your filters or check back later."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {cards.map((card) => (
                  <InternshipCard
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    companyName={card.companyName}
                    locationType={card.locationType}
                    skills={card.skills}
                    deadline={card.deadline}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
