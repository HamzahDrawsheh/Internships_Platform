"use client";

import { Input, Select, Button } from "@/components/ui";
import type { SelectOption } from "@/components/ui";

export interface InternshipFiltersState {
  search: string;
  location: string;
  skill: string;
  duration: string;
  deadline: string;
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
  { value: "JavaScript", label: "JavaScript" },
  { value: "React", label: "React" },
  { value: "Machine Learning", label: "Machine Learning" },
  { value: "SQL", label: "SQL" },
  { value: "NLP", label: "NLP" },
  { value: "Data Visualization", label: "Data Visualization" },
  { value: "Node.js", label: "Node.js" },
];

const durationOptions: SelectOption[] = [
  { value: "", label: "Any duration" },
  { value: "4", label: "4 weeks" },
  { value: "8", label: "8 weeks" },
  { value: "12", label: "12 weeks" },
  { value: "16", label: "16 weeks" },
  { value: "20", label: "20+ weeks" },
];

interface InternshipFiltersSidebarProps {
  filters: InternshipFiltersState;
  onFiltersChange: (f: InternshipFiltersState) => void;
  onClear: () => void;
}

export function InternshipFiltersSidebar({
  filters,
  onFiltersChange,
  onClear,
}: InternshipFiltersSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <div className="sticky top-20 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Filters</h2>
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Clear all
          </button>
        </div>
        <div className="space-y-4">
          <Input
            label="Search"
            placeholder="Title or company..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="rounded-lg"
          />
          <Select
            label="Location"
            options={locationOptions}
            value={filters.location}
            onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
          />
          <Select
            label="Skills"
            options={skillOptions}
            value={filters.skill}
            onChange={(e) => onFiltersChange({ ...filters, skill: e.target.value })}
          />
          <Select
            label="Duration"
            options={durationOptions}
            value={filters.duration}
            onChange={(e) => onFiltersChange({ ...filters, duration: e.target.value })}
          />
          <Input
            label="Deadline before"
            type="date"
            value={filters.deadline}
            onChange={(e) => onFiltersChange({ ...filters, deadline: e.target.value })}
          />
          <Button variant="secondary" onClick={onClear} className="w-full">
            Reset filters
          </Button>
        </div>
      </div>
    </aside>
  );
}
