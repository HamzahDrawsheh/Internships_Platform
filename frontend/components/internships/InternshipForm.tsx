"use client";

import { useState } from "react";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import Textarea from "@/components/common/Textarea";
import Button from "@/components/common/Button";
import type { LocationType } from "@/lib/types";

export interface InternshipFormValues {
  title: string;
  description: string;
  locationType: LocationType;
  skills: string;
  durationWeeks: string;
  startDate: string;
  deadline: string;
  openPositions: string;
}

const locationOptions = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

interface InternshipFormProps {
  initialValues?: Partial<InternshipFormValues>;
  onSubmit: (values: InternshipFormValues) => void;
  onSaveDraft?: (values: InternshipFormValues) => void;
  submitLabel?: string;
}

const defaultValues: InternshipFormValues = {
  title: "",
  description: "",
  locationType: "hybrid",
  skills: "",
  durationWeeks: "",
  startDate: "",
  deadline: "",
  openPositions: "1",
};

export default function InternshipForm({
  initialValues,
  onSubmit,
  onSaveDraft,
  submitLabel = "Publish",
}: InternshipFormProps) {
  const [values, setValues] = useState<InternshipFormValues>({ ...defaultValues, ...initialValues });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Title"
        required
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        placeholder="e.g. Machine Learning Intern"
      />
      <Textarea
        label="Description"
        required
        rows={4}
        value={values.description}
        onChange={(e) => setValues({ ...values, description: e.target.value })}
        placeholder="Role description and responsibilities..."
      />
      <Select
        label="Location type"
        options={locationOptions}
        value={values.locationType}
        onChange={(e) => setValues({ ...values, locationType: e.target.value as LocationType })}
      />
      <Input
        label="Required skills (comma-separated)"
        value={values.skills}
        onChange={(e) => setValues({ ...values, skills: e.target.value })}
        placeholder="Python, ML, SQL"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Duration (weeks)"
          type="number"
          min={1}
          value={values.durationWeeks}
          onChange={(e) => setValues({ ...values, durationWeeks: e.target.value })}
        />
        <Input
          label="Open positions"
          type="number"
          min={1}
          value={values.openPositions}
          onChange={(e) => setValues({ ...values, openPositions: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Start date"
          type="date"
          value={values.startDate}
          onChange={(e) => setValues({ ...values, startDate: e.target.value })}
        />
        <Input
          label="Application deadline"
          type="date"
          value={values.deadline}
          onChange={(e) => setValues({ ...values, deadline: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">{submitLabel}</Button>
        {onSaveDraft && (
          <Button type="button" variant="secondary" onClick={() => onSaveDraft(values)}>
            Save as Draft
          </Button>
        )}
      </div>
    </form>
  );
}
