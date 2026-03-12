"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { InternshipFiltersSidebar, type InternshipFiltersState } from "@/components/internships/InternshipFiltersSidebar";
import { InternshipCard } from "@/components/internships/InternshipCard";
import { Button, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
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
    const params = new URLSearchParams();
    params.set("status", "active");
    if (filters.location) params.set("location_type", filters.location);
    if (filters.duration) params.set("duration_weeks", filters.duration);
    if (filters.deadline) params.set("deadline_lte", filters.deadline);

    api
      .get<{ data: Internship[] }>(`/internships?${params.toString()}`)
      .then(({ data }) => {
        const list = data ?? [];
        if (filters.skill) {
          setInternships(list.filter((i) => (i.skills ?? []).some((s) => s.toLowerCase().includes(filters.skill.toLowerCase()))));
        } else {
          setInternships(list);
        }
      })
      .catch(() => setInternships([]))
      .finally(() => setLoading(false));
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
