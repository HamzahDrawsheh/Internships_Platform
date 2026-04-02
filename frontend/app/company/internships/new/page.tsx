"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input, Select, Textarea, Button, Card } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const locationOptions: SelectOption[] = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
  { value: "hybrid", label: "Hybrid" },
];

export default function CreateInternshipPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("hybrid");
  const [skills, setSkills] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [openPositions, setOpenPositions] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const createInternship = async (isActive: boolean) => {
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) {
      setError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("create internship user error:", userError);
        setError("Unable to verify your account. Please sign in again.");
        return;
      }
      if (!user) {
        setError("You must be logged in to create an internship.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("create internship profile error:", profileError);
        setError("Unable to verify your role.");
        return;
      }
      if (profile?.role !== "company") {
        setError("Only company accounts can create internships.");
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("create internship company error:", companyError);
        setError("Unable to load your company profile.");
        return;
      }
      if (!company) {
        setError("Company profile not found. Please complete your company profile first.");
        return;
      }

      const payload = {
        company_id: company.id,
        title: trimmedTitle,
        description: trimmedDescription,
        requirements: skills.trim() || null,
        duration: durationWeeks ? `${durationWeeks} weeks` : null,
        location: locationType || null,
        type: "internship",
        is_active: isActive,
      };

      const { error: insertError } = await supabase.from("internship_positions").insert(payload);

      if (insertError) {
        console.error("create internship insert error:", insertError);
        setError("Failed to create internship. Please try again.");
        return;
      }

      setSuccess(isActive ? "Internship published successfully." : "Internship draft saved.");
      router.push("/company/internships");
      router.refresh();
    } catch (err) {
      console.error("create internship unexpected error:", err);
      setError("Unexpected error while creating internship.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    await createInternship(true);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    await createInternship(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title="Create Internship"
          description="Add a new internship listing. Save as draft or publish."
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Cancel</Button>
            </Link>
          }
        />
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 transition-colors duration-300 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 transition-colors duration-300 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">
            {success}
          </div>
        )}
        <form onSubmit={handlePublish} className="space-y-6">
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
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Saving..." : "Publish"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={submitting}>
              {submitting ? "Saving..." : "Save as Draft"}
            </Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
