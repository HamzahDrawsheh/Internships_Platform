"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Button, EmptyState } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { InternshipCard } from "@/components/internships/InternshipCard";

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
