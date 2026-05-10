"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

export default function EditInternshipPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationType, setLocationType] = useState("hybrid");
  const [skills, setSkills] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentIsActive, setCurrentIsActive] = useState<boolean>(true);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("edit internship getUser error:", userError);
        setError("Unable to verify your account.");
        setLoading(false);
        return;
      }
      if (!user) {
        setError("Please login to edit internships.");
        setLoading(false);
        return;
      }
      if (!id) {
        setError("Invalid internship id.");
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("edit internship role error:", profileError);
        setError("Unable to verify your role.");
        setLoading(false);
        return;
      }
      if (profile?.role !== "company") {
        setError("Only company accounts can edit internships.");
        setLoading(false);
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError) {
        console.error("edit internship company lookup error:", companyError);
        setError("Unable to load your company profile.");
        setLoading(false);
        return;
      }
      if (!company) {
        setError("Company profile not found.");
        setLoading(false);
        return;
      }

      const { data: position, error: positionError } = await supabase
        .from("internship_positions")
        .select("id, title, description, requirements, duration, duration_weeks, location, is_active")
        .eq("id", id)
        .eq("company_id", company.id)
        .maybeSingle();

      if (positionError) {
        console.error("edit internship position load error:", positionError);
        setError("Unable to load this internship.");
        setLoading(false);
        return;
      }
      if (!position) {
        setError("Internship not found (or you don’t have access).");
        setLoading(false);
        return;
      }

      setTitle(position.title ?? "");
      setDescription(position.description ?? "");
      setSkills(position.requirements ?? "");
      const loc = typeof position.location === "string" && position.location.trim() ? position.location.trim() : "hybrid";
      setLocationType(loc);
      const weeksFromCol =
        typeof position.duration_weeks === "number" && position.duration_weeks > 0
          ? String(position.duration_weeks)
          : "";
      const durationValue =
        weeksFromCol ||
        (typeof position.duration === "string" && position.duration.toLowerCase().includes("week")
          ? position.duration.toLowerCase().replace("weeks", "").replace("week", "").trim()
          : "");
      setDurationWeeks(durationValue);
      setCurrentIsActive(Boolean(position.is_active));

      setLoading(false);
    };

    void load();
  }, [id]);

  const updateInternship = async (nextIsActive: boolean) => {
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) {
      setError("Title and description are required.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (userError) console.error("edit internship save getUser error:", userError);
        setError("You must be logged in to update an internship.");
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (companyError || !company) {
        if (companyError) console.error("edit internship save company lookup error:", companyError);
        setError("Unable to verify your company profile.");
        return;
      }

      const weeksNum = durationWeeks.trim() !== "" ? Number.parseInt(durationWeeks, 10) : NaN;
      const duration_weeks =
        Number.isFinite(weeksNum) && weeksNum > 0 ? weeksNum : null;

      const payload = {
        title: trimmedTitle,
        description: trimmedDescription,
        requirements: skills.trim() || null,
        duration: duration_weeks != null ? `${duration_weeks} weeks` : null,
        duration_weeks,
        location: locationType || null,
        is_active: nextIsActive,
      };

      const { error: updateError } = await supabase
        .from("internship_positions")
        .update(payload)
        .eq("id", id)
        .eq("company_id", company.id);

      if (updateError) {
        console.error("edit internship update error:", updateError);
        setError("Failed to update internship. Please try again.");
        return;
      }

      void fetch("/api/embeddings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scope: "internship", internshipId: id }),
      }).catch(() => {});

      setCurrentIsActive(nextIsActive);
      setSuccess(nextIsActive ? "Internship updated & published." : "Internship updated (saved as draft).");
      router.push("/company/internships");
      router.refresh();
    } catch (err) {
      console.error("edit internship unexpected error:", err);
      setError("Unexpected error while updating internship.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    void updateInternship(false);
  };

  return (
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <Container className="max-w-2xl">
        <PageHeader
          title="Edit Internship"
          description={
            loading
              ? "Loading internship…"
              : currentIsActive
                ? "Update internship listing details. Saving will keep it published."
                : "This internship is currently a draft (inactive). Publish when ready."
          }
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void updateInternship(true);
          }}
          className="space-y-6"
        >
          <Card>
            <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Machine Learning Intern" />
            <Textarea label="Description" required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-4" placeholder="Role description and responsibilities..." />
            <Select label="Location type" options={locationOptions} value={locationType} onChange={(e) => setLocationType(e.target.value)} className="mt-4" />
            <Input label="Required skills (comma-separated)" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, ML, SQL" className="mt-4" />
            <div className="mt-4">
              <Input label="Duration (weeks)" type="number" min={1} value={durationWeeks} onChange={(e) => setDurationWeeks(e.target.value)} />
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={saving || loading}>
              {saving ? "Saving..." : "Save & publish"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={saving || loading}>
              {saving ? "Saving..." : "Save as draft"}
            </Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
