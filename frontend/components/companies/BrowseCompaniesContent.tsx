"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardGridSkeleton } from "@/components/loading";
import { SearchBar, Button, EmptyState, Select } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { createClient } from "@/lib/supabase/client";
import { industriesMatch, uniqueIndustryLabels } from "@/lib/companies/industry";

type CompanyRow = {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  description?: string;
  rating?: number;
  logoUrl?: string;
  isNewCompany: boolean;
  evaluationEnabled: boolean;
  openPositions: number;
  ownerUserId?: string;
};

type SortOption = "newest" | "name-asc" | "name-desc" | "rating-desc";

const sortOptions: SelectOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "rating-desc", label: "Highest rated" },
];

type Props = {
  /** Base path for company detail links, e.g. `/companies` or `/supervisor/companies`. */
  companiesBasePath?: string;
};

export function BrowseCompaniesContent({ companiesBasePath = "/companies" }: Props) {
  const [search, setSearch] = useState("");
  const [activeIndustry, setActiveIndustry] = useState("All");
  const [sort, setSort] = useState<SortOption>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: companyRows, error: companyError } = await supabase
        .from("companies")
        .select(
          "id, company_name, description, location, industry, logo_url, is_new_company, evaluation_enabled, average_student_rating, created_at, user_id",
        )
        .order("created_at", { ascending: false });

      if (companyError) {
        console.error("companies fetch error:", companyError);
        setError("Failed to load companies.");
        setCompanies([]);
        setLoading(false);
        return;
      }

      const companyIds = (companyRows ?? []).map((row) => row.id);
      const openPositionsByCompany = new Map<string, number>();

      if (companyIds.length > 0) {
        const { data: positionRows, error: positionsError } = await supabase
          .from("internship_positions")
          .select("company_id")
          .in("company_id", companyIds)
          .eq("is_active", true);

        if (positionsError) {
          console.error("company positions fetch error:", positionsError);
        } else {
          for (const row of positionRows ?? []) {
            const companyId = row.company_id as string;
            openPositionsByCompany.set(companyId, (openPositionsByCompany.get(companyId) ?? 0) + 1);
          }
        }
      }

      const mapped = (companyRows ?? []).map((row) => {
        const evaluationEnabled = Boolean(row.evaluation_enabled);
        const isNewCompany = row.is_new_company == null ? true : Boolean(row.is_new_company);
        const avgRating =
          row.average_student_rating != null ? Number(Number(row.average_student_rating).toFixed(1)) : undefined;

        return {
          id: row.id,
          name: row.company_name ?? "Company",
          industry: row.industry ?? undefined,
          location: row.location ?? undefined,
          description: row.description ?? undefined,
          rating: evaluationEnabled && !isNewCompany && avgRating != null ? avgRating : undefined,
          logoUrl: row.logo_url ?? undefined,
          isNewCompany,
          evaluationEnabled,
          openPositions: openPositionsByCompany.get(row.id) ?? 0,
          ownerUserId: row.user_id ?? undefined,
        };
      });

      setCompanies(mapped);
      setLoading(false);
    };

    load();
  }, []);

  const industryFilters = useMemo(
    () => ["All", ...uniqueIndustryLabels(companies.map((c) => c.industry))],
    [companies],
  );

  const visibleCompanies = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    const filtered = companies.filter((company) => {
      const matchesSearch =
        !searchValue ||
        company.name.toLowerCase().includes(searchValue) ||
        (company.industry ?? "").toLowerCase().includes(searchValue) ||
        (company.location ?? "").toLowerCase().includes(searchValue) ||
        (company.description ?? "").toLowerCase().includes(searchValue);

      const matchesIndustry = industriesMatch(company.industry, activeIndustry);

      return matchesSearch && matchesIndustry;
    });

    const sorted = [...filtered];
    switch (sort) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "rating-desc":
        sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case "newest":
      default:
        break;
    }

    return sorted;
  }, [companies, search, activeIndustry, sort]);

  const hasActiveFilters = search.trim().length > 0 || activeIndustry !== "All";

  const clearFilters = () => {
    setSearch("");
    setActiveIndustry("All");
    setSort("newest");
  };

  return (
    <Container>
      <PageHeader
        title="Browse Companies"
        description="Explore organizations offering internships and compare student ratings."
      />

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by name, industry, or location…" />
          </div>
          <div className="w-full lg:w-56">
            <Select label="Sort by" options={sortOptions} value={sort} onChange={(e) => setSort(e.target.value as SortOption)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {industryFilters.map((industry) => {
            const isActive = activeIndustry === industry;
            return (
              <Button
                key={industry}
                type="button"
                variant={isActive ? "primary" : "secondary"}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors duration-300 ${
                  isActive ? "" : "dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
                onClick={() => setActiveIndustry(industry)}
              >
                {industry}
              </Button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
          <p className="text-slate-600 dark:text-slate-400">
            {loading ? "Loading companies…" : `${visibleCompanies.length} of ${companies.length} companies`}
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

      {loading ? (
        <CardGridSkeleton variant="company" columns="sm:grid-cols-2 xl:grid-cols-3" className="gap-6" />
      ) : error ? (
        <EmptyState
          title="Unable to load companies"
          description={error}
          className="transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
        />
      ) : visibleCompanies.length === 0 ? (
        <EmptyState
          title={companies.length === 0 ? "No companies yet" : "No matching companies"}
          description={
            companies.length === 0
              ? "Companies will appear here when they join the platform."
              : "Try a different search term or industry filter."
          }
          className="transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              id={company.id}
              name={company.name}
              industry={company.industry}
              location={company.location}
              description={company.description}
              rating={company.rating}
              logoUrl={company.logoUrl}
              isNewCompany={company.isNewCompany}
              evaluationEnabled={company.evaluationEnabled}
              openPositions={company.openPositions}
              ownerUserId={company.ownerUserId}
              companiesBasePath={companiesBasePath}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
