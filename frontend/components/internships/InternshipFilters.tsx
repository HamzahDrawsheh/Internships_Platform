"use client";

import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";

export interface FilterState {
  search: string;
  locationType: string;
  skill: string;
  deadlineBefore: string;
  company: string;
}

const locationOptions = [
  { value: "", label: "All locations" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

const skillOptions = [
  { value: "", label: "Any skill" },
  { value: "Python", label: "Python" },
  { value: "Machine Learning", label: "Machine Learning" },
  { value: "SQL", label: "SQL" },
  { value: "NLP", label: "NLP" },
  { value: "Data Visualization", label: "Data Visualization" },
];

interface InternshipFiltersProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  companies: { id: string; name: string }[];
  onClear: () => void;
}

export default function InternshipFilters({ filters, onFiltersChange, companies, onClear }: InternshipFiltersProps) {
  const companyOptions = [{ value: "", label: "All companies" }, ...companies.map((c) => ({ value: c.id, label: c.name }))];
  return (
    <aside className="w-full shrink-0 space-y-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4 lg:w-64">
      <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
      <Input
        label="Search"
        placeholder="Title or company..."
        value={filters.search}
        onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
      />
      <Select
        label="Location"
        options={locationOptions}
        value={filters.locationType}
        onChange={(e) => onFiltersChange({ ...filters, locationType: e.target.value })}
      />
      <Select
        label="Skill"
        options={skillOptions}
        value={filters.skill}
        onChange={(e) => onFiltersChange({ ...filters, skill: e.target.value })}
      />
      <Input
        label="Deadline before"
        type="date"
        value={filters.deadlineBefore}
        onChange={(e) => onFiltersChange({ ...filters, deadlineBefore: e.target.value })}
      />
      <Select
        label="Company"
        options={companyOptions}
        value={filters.company}
        onChange={(e) => onFiltersChange({ ...filters, company: e.target.value })}
      />
      <Button variant="ghost" onClick={onClear} className="w-full">Clear filters</Button>
    </aside>
  );
}
