"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternshipFiltersSidebar, type InternshipFiltersState } from "@/components/internships/InternshipFiltersSidebar";
import { InternshipCard } from "@/components/internships/InternshipCard";
import { Button, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { Internship } from "@/lib/types";

const defaultFilters: InternshipFiltersState = {
  search: "",
  location: "",
  skill: "",
  duration: "",
  deadline: "",
};

export default function BrowseInternshipsPage() {
  const [filters, setFilters] = useState<InternshipFiltersState>(defaultFilters);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let query = supabase
      .from("internships")
      .select(`
        id,
        company_id,
        title,
        description,
        location_type,
        skills,
        duration_weeks,
        start_date,
        deadline,
        open_positions,
        status,
        created_at,
        company:profiles!company_id(full_name)
      `)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (filters.location) query = query.eq("location_type", filters.location);
    if (filters.skill) query = query.contains("skills", [filters.skill]);
    if (filters.duration) query = query.eq("duration_weeks", parseInt(filters.duration, 10));
    if (filters.deadline) query = query.lte("deadline", filters.deadline);

    query.then(({ data, error }) => {
      if (error) {
        setInternships([]);
        setLoading(false);
        return;
      }
      const rows = (data ?? []).map((row: Record<string, unknown>) => {
        const company = row.company as { full_name?: string } | null;
        return {
          ...row,
          company_name: company?.full_name ?? null,
        } as Internship;
      });
      setInternships(rows);
      setLoading(false);
    });
  }, [filters.location, filters.skill, filters.duration, filters.deadline]);

  const filteredBySearch = useMemo(() => {
    if (!filters.search.trim()) return internships;
    const q = filters.search.trim().toLowerCase();
    return internships.filter(
      (i) =>
        i.title?.toLowerCase().includes(q) ||
        (i.company_name ?? "").toLowerCase().includes(q)
    );
  }, [internships, filters.search]);

  const clearFilters = () => setFilters(defaultFilters);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.location !== "" ||
    filters.skill !== "" ||
    filters.duration !== "" ||
    filters.deadline !== "";

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Browse Internships"
          description="Find AI & Data Science internships. Filter by location, skills, duration, and deadline."
          action={
            <Link href="/auth/signup">
              <Button variant="primary">Create account to apply</Button>
            </Link>
          }
        />

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Left: Filters */}
          <InternshipFiltersSidebar
            filters={filters}
            onFiltersChange={setFilters}
            onClear={clearFilters}
          />

          {/* Right: Card list */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-44 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
                  />
                ))}
              </div>
            ) : filteredBySearch.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? "No internships match your filters" : "No internships available yet"}
                description={
                  hasActiveFilters
                    ? "Try clearing some filters or broadening your search."
                    : "Create an account and use the demo data, or wait for companies to post listings."
                }
                actionLabel={hasActiveFilters ? "Clear filters" : undefined}
                onAction={hasActiveFilters ? clearFilters : undefined}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {filteredBySearch.length} internship{filteredBySearch.length === 1 ? "" : "s"} found
                </p>
                <ul className="space-y-4" role="list">
                  {filteredBySearch.map((internship) => (
                    <li key={internship.id}>
                      <InternshipCard internship={internship} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
