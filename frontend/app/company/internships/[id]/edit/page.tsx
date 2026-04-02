"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Textarea, Button, Card } from "@/components/ui";
import type { SelectOption } from "@/components/ui";

const locationOptions: SelectOption[] = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

export default function EditInternshipPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("hybrid");
  const [skills, setSkills] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [openPositions, setOpenPositions] = useState("1");

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/company/internships");
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/company/internships");
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title="Edit Internship"
          description={id ? `Editing internship` : "Edit internship listing."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Cancel</Button>
            </Link>
          }
        />
        <form onSubmit={handleUpdate} className="space-y-6">
          <Card>
            <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Machine Learning Intern" />
            <Textarea label="Description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4" placeholder="Role description and responsibilities..." />
            <Select label="Location type" options={locationOptions} value={locationType} onChange={(e) => setLocationType(e.target.value)} className="mt-4" />
            <Input label="Required skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, ML, SQL" className="mt-4" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Duration (weeks)" type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
              <Input label="Open positions" type="number" min={1} value={openPositions} onChange={(e) => setOpenPositions(e.target.value)} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <Input label="Application deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">Update</Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft}>Save as Draft</Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
