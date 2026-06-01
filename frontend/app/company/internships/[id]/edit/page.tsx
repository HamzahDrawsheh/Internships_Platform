"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProfileFormSkeleton } from "@/components/loading";
import { Input, Select, Textarea, Button, Card, Modal } from "@/components/ui";
import type { SelectOption } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  isApplicationDeadlinePassed,
  todayIsoDate,
} from "@/lib/internships/application-deadline";
import { countEnrolledApplicationsForPosition } from "@/lib/internships/enrollment";
import { suggestExtendedApplicationDeadline } from "@/lib/internships/extend-listing";
import { normalizeDateInputValue } from "@/lib/internships/dates";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [applicationDeadline, setApplicationDeadline] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentIsActive, setCurrentIsActive] = useState<boolean>(true);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [listingExpired, setListingExpired] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDeadline, setExtendDeadline] = useState("");
  const [extending, setExtending] = useState(false);

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
        .select("id, title, description, requirements, duration, duration_weeks, location, is_active, start_date, end_date, application_deadline, additional_notes")
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

      const loadedStart = normalizeDateInputValue(position.start_date);
      const loadedEnd = normalizeDateInputValue(position.end_date);
      const loadedDeadline =
        normalizeDateInputValue(position.application_deadline) || loadedStart;

      setStartDate(loadedStart);
      setEndDate(loadedEnd);
      setApplicationDeadline(loadedDeadline);
      setExtendDeadline(suggestExtendedApplicationDeadline(loadedStart));
      setListingExpired(isApplicationDeadlinePassed(loadedDeadline));
      setAdditionalNotes(typeof position.additional_notes === "string" ? position.additional_notes : "");
      setCurrentIsActive(Boolean(position.is_active));

      const enrolled = await countEnrolledApplicationsForPosition(supabase, id);
      setEnrolledCount(enrolled);

      setLoading(false);
    };

    void load();
  }, [id]);

  const hasEnrolledStudents = enrolledCount > 0;

  const extendApplicationPeriod = async () => {
    setError(null);
    setSuccess(null);
    setExtending(true);
    try {
      const res = await fetch(`/api/company/internships/${id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ application_deadline: extendDeadline }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        application_deadline?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to extend application period.");
        return;
      }
      const newDeadline = data.application_deadline ?? extendDeadline;
      setApplicationDeadline(newDeadline);
      setListingExpired(false);
      setCurrentIsActive(true);
      setExtendOpen(false);
      setSuccess("Application period extended — new students can apply.");
    } catch (err) {
      console.error("extend application period:", err);
      setError("Unexpected error while extending.");
    } finally {
      setExtending(false);
    }
  };

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
    try {
      const res = await fetch(`/api/company/internships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          requirements: skills.trim() || null,
          additional_notes: additionalNotes.trim() || null,
          location: locationType || null,
          is_active: nextIsActive,
          start_date: startDate,
          end_date: endDate,
          application_deadline: applicationDeadline || startDate,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Failed to update internship. Please try again.");
        return;
      }

      void fetch("/api/embeddings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ scope: "internship", internshipId: id }),
      }).catch(() => {});

      setCurrentIsActive(nextIsActive);
      if (!isApplicationDeadlinePassed(applicationDeadline || startDate)) {
        setListingExpired(false);
      }
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
        {loading ? (
          <ProfileFormSkeleton />
        ) : (
        <>
        {listingExpired && (
          <div
            className="mb-4 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            role="status"
          >
            <p>
              The application deadline has passed. Use <strong>Extend</strong> to set a new apply-by date so more
              students can apply. Existing trainees are not affected.
            </p>
            <Button type="button" variant="primary" onClick={() => setExtendOpen(true)} disabled={extending}>
              Extend applications
            </Button>
          </div>
        )}
        {hasEnrolledStudents && (
          <div
            className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300"
            role="status"
          >
            <strong>
              {enrolledCount} trainee{enrolledCount === 1 ? "" : "s"} linked to this listing.
            </strong>{" "}
            Listing start/end dates are for the posting and future applicants. Each enrolled student&apos;s training
            period is set individually from their accept/commit date and is not changed when you edit this form.
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Start date"
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  if (!applicationDeadline || applicationDeadline > next) {
                    setApplicationDeadline(next);
                  }
                }}
              />
              <Input
                label="Application deadline"
                type="date"
                required
                value={applicationDeadline}
                max={startDate || undefined}
                onChange={(e) => setApplicationDeadline(e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                required
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="sm:col-span-2"
              />
            </div>
            <Textarea
              label="Additional notes (optional)"
              rows={3}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              className="mt-4"
              placeholder="Schedule details, office location, benefits, or anything else applicants should know."
            />
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

        <Modal
          isOpen={extendOpen}
          onClose={() => setExtendOpen(false)}
          title="Extend application period"
          footer={
            <>
              <Button variant="secondary" onClick={() => setExtendOpen(false)} disabled={extending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void extendApplicationPeriod()}
                disabled={extending || !extendDeadline}
              >
                {extending ? "Saving…" : "Reopen for applications"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-700 dark:text-slate-300">
            Choose a new application deadline. Trainees already enrolled keep their own schedule.
          </p>
          <Input
            label="New application deadline"
            type="date"
            required
            className="mt-4"
            value={extendDeadline}
            min={todayIsoDate()}
            max={startDate || undefined}
            onChange={(e) => setExtendDeadline(e.target.value)}
          />
        </Modal>
        </>
        )}
      </Container>
    </main>
  );
}
