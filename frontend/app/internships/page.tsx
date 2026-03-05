"use client";

import { useState } from "react";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Button, EmptyState } from "@/components/ui";
import type { SelectOption } from "@/components/ui";

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

  const clearFilters = () => {
    setSearch("");
    setLocationType("");
    setSkill("");
    setDeadlineBefore("");
  };

  return (
    <main className="py-8">
      <Container>
        <PageHeader
          title="Browse Internships"
          description="Filter by location, skills, and deadline. Connect to the backend to load listings."
        />
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4 lg:w-64">
            <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
            <Input
              label="Search"
              placeholder="Title or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              label="Location type"
              options={locationOptions}
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
            />
            <Select
              label="Skill"
              options={skillOptions}
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
            <Input
              label="Deadline before"
              type="date"
              value={deadlineBefore}
              onChange={(e) => setDeadlineBefore(e.target.value)}
            />
            <Button variant="secondary" onClick={clearFilters} className="w-full">
              Clear filters
            </Button>
          </aside>
          <div className="min-w-0 flex-1">
            <EmptyState
              title="No internships available yet."
              description="Connect the app to Supabase or FastAPI to load internship listings."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </div>
        </div>
      </Container>
    </main>
  );
}
