"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchBar } from "@/components/ui";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const filters = ["All", "Technology", "Finance", "Healthcare"] as const;

export default function BrowseCompaniesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<{ id: string; name: string; industry?: string; location?: string; description?: string; rating?: number }[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: companyRows, error: companyError } = await supabase
        .from("companies")
        .select("id, company_name, description, location, industry")
        .order("created_at", { ascending: false });

      if (companyError) {
        console.error("companies fetch error:", companyError);
        setError("Failed to load companies.");
        setCompanies([]);
        setLoading(false);
        return;
      }

      const ids = (companyRows ?? []).map((c) => c.id);
      const { data: ratingsRows, error: ratingsError } = ids.length
        ? await supabase.from("ratings").select("company_id, rating").in("company_id", ids)
        : { data: [] as { company_id: string; rating: number }[], error: null };

      if (ratingsError) {
        // Keep companies list available even if ratings read fails.
        console.error("companies ratings fetch error:", ratingsError);
      }

      const ratingsByCompany = new Map<string, { total: number; count: number }>();
      (ratingsRows ?? []).forEach((r) => {
        const prev = ratingsByCompany.get(r.company_id) ?? { total: 0, count: 0 };
        ratingsByCompany.set(r.company_id, { total: prev.total + Number(r.rating), count: prev.count + 1 });
      });

      const mapped = (companyRows ?? []).map((row) => {
        const agg = ratingsByCompany.get(row.id);
        return {
          id: row.id,
          name: row.company_name ?? "Company",
          industry: row.industry ?? undefined,
          location: row.location ?? undefined,
          description: row.description ?? undefined,
          rating: agg && agg.count > 0 ? Number((agg.total / agg.count).toFixed(1)) : undefined,
        };
      });

      setCompanies(mapped);
      setLoading(false);
    };

    load();
  }, []);

  const visibleCompanies = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return companies.filter((c) => {
      const matchesSearch =
        !searchValue ||
        c.name.toLowerCase().includes(searchValue) ||
        (c.industry ?? "").toLowerCase().includes(searchValue) ||
        (c.location ?? "").toLowerCase().includes(searchValue) ||
        (c.description ?? "").toLowerCase().includes(searchValue);

      const normalizedIndustry = (c.industry ?? "").trim().toLowerCase();
      const normalizedFilter = activeFilter.toLowerCase();
      const matchesFilter = activeFilter === "All" || normalizedIndustry === normalizedFilter;

      return matchesSearch && matchesFilter;
    });
  }, [companies, search, activeFilter]);

  return (
    <main className="min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-slate-900 transition-colors duration-300 dark:text-white">Browse Companies</h1>
        <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">Discover companies offering AI internships.</p>

        <div className="mt-8">
          <SearchBar value={search} onChange={setSearch} placeholder="Search companies…" className="max-w-md" />
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f}
                type="button"
                variant={activeFilter === f ? "primary" : "secondary"}
                className={`rounded-xl transition-colors duration-300 ${
                  activeFilter === f ? "" : "dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">Loading companies...</p>
          ) : error ? (
            <EmptyState title="Unable to load companies" description={error} className="transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400" />
          ) : visibleCompanies.length === 0 ? (
            <EmptyState
              title={companies.length === 0 ? "No companies yet" : "No matching companies"}
              description={
                companies.length === 0
                  ? "Companies will appear here when they join."
                  : "Try a different search term or industry filter."
              }
              className="transition-colors duration-300 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCompanies.map((c) => (
                <CompanyCard key={c.id} id={c.id} name={c.name} industry={c.industry} location={c.location} rating={c.rating} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
