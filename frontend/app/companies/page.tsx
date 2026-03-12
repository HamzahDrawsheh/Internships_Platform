"use client";

import { useState } from "react";
import { SearchBar } from "@/components/ui";
import { CompanyCard } from "@/components/companies/CompanyCard";
import { Button, EmptyState } from "@/components/ui";

const filters = ["All", "Technology", "Finance", "Healthcare"];

export default function BrowseCompaniesPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const companies: { id: string; name: string; industry?: string; location?: string; rating?: number }[] = [];

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[#0F172A]">Browse Companies</h1>
        <p className="mt-1 text-sm text-[#0F172A]/70">Discover companies offering AI internships.</p>

        <div className="mt-8">
          <SearchBar value={search} onChange={setSearch} placeholder="Search companies…" className="max-w-md" />
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button key={f} type="button" variant={activeFilter === f ? "primary" : "secondary"} className="rounded-xl" onClick={() => setActiveFilter(f)}>
                {f}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {companies.length === 0 ? (
            <EmptyState title="No companies yet" description="Companies will appear here when they join." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((c) => (
                <CompanyCard key={c.id} id={c.id} name={c.name} industry={c.industry} location={c.location} rating={c.rating} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
