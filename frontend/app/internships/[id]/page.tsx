"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge, Button, Modal, Textarea, EmptyState } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

const locationLabel: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };

export default function InternshipDetailsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [position, setPosition] = useState<{
    id: string;
    title: string;
    description: string | null;
    requirements: string | null;
    duration: string | null;
    location: string | null;
    type: string | null;
    is_active: boolean;
    created_at: string;
    company_id: string;
  } | null>(null);
  const [companyName, setCompanyName] = useState<string>("Company");
  const [ratingInfo, setRatingInfo] = useState<{ average: number | null; count: number }>({ average: null, count: 0 });

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      const { data: pos } = await supabase
        .from("internship_positions")
        .select("id, title, description, requirements, duration, location, type, is_active, created_at, company_id")
        .eq("id", id)
        .single();

      if (!pos) {
        setPosition(null);
        setLoading(false);
        return;
      }

      setPosition(pos);

      const { data: company } = await supabase
        .from("companies")
        .select("company_name")
        .eq("id", pos.company_id)
        .single();
      setCompanyName(company?.company_name ?? "Company");

      const { data: ratings } = await supabase
        .from("ratings")
        .select("rating")
        .eq("company_id", pos.company_id);

      const safeRatings = ratings ?? [];
      if (safeRatings.length > 0) {
        const total = safeRatings.reduce((sum, r) => sum + Number(r.rating), 0);
        setRatingInfo({ average: total / safeRatings.length, count: safeRatings.length });
      } else {
        setRatingInfo({ average: null, count: 0 });
      }

      setLoading(false);
    };

    if (id) load();
  }, [id]);

  const skills = useMemo(
    () =>
      position?.requirements
        ? position.requirements
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    [position]
  );

  const handleApply = async () => {
    if (!position) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in first to apply.");
      setSubmitting(false);
      return;
    }

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!student) {
      setError("Student profile not found. Please complete your student profile first.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("applications").insert({
      student_id: student.id,
      position_id: position.id,
      message: coverLetter.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You already applied to this internship.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    setSuccess("Application submitted successfully.");
    setCoverLetter("");
    setApplyOpen(false);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <main className="py-8">
        <Container className="max-w-4xl">
          <p className="text-sm text-gray-500">Loading internship details...</p>
        </Container>
      </main>
    );
  }

  if (!position) {
    return (
      <main className="py-8">
        <Container className="max-w-4xl">
          <EmptyState
            title="Internship not found"
            description="This internship may be unavailable or no longer active."
            actionLabel="Back to listings"
            actionHref="/internships"
          />
        </Container>
      </main>
    );
  }

  return (
    <main className="py-8">
      <Container className="max-w-4xl">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800" role="status">
            {success}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{position.title}</h1>
            <p className="mt-1 text-gray-600">{companyName}</p>
            <Badge variant="info" className="mt-2">
              {locationLabel[position.location ?? ""] ?? position.location ?? "On-site"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary">Bookmark</Button>
            <Button variant="primary" onClick={() => setApplyOpen(true)} disabled={!position.is_active}>
              Apply
            </Button>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
          <section>
            <h2 className="text-sm font-semibold text-gray-900">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-600">{position.description ?? "No description provided."}</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-900">Required skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">No specific requirements listed.</p>
              ) : (
                skills.map((s) => (
                <Badge key={s} variant="default">{s}</Badge>
                ))
              )}
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="text-sm text-gray-500">Duration</span>
              <p className="font-medium text-gray-900">{position.duration ?? "Not specified"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Type</span>
              <p className="font-medium text-gray-900">{position.type ?? "Not specified"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Posted</span>
              <p className="font-medium text-gray-900">{new Date(position.created_at).toLocaleDateString()}</p>
            </div>
          </section>
          <section className="rounded border border-gray-100 bg-gray-50/50 p-4">
            <h2 className="text-sm font-semibold text-gray-900">Company</h2>
            <p className="mt-1 text-sm text-gray-600">
              {companyName}
              {ratingInfo.average
                ? ` — Rating ${ratingInfo.average.toFixed(1)} / 5 (${ratingInfo.count})`
                : " — No ratings yet"}
            </p>
          </section>
        </div>

        <p className="mt-4">
          <Link href="/internships" className="text-sm font-medium text-gray-900 hover:underline">
            ← Back to listings
          </Link>
        </p>

        <Modal
          isOpen={applyOpen}
          onClose={() => setApplyOpen(false)}
          title="Apply for this internship"
          footer={
            <>
              <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleApply} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
            </>
          }
        >
          <p className="text-sm text-gray-600">Your profile will be sent to the company. Optionally add a cover letter below.</p>
          <Textarea
            label="Cover letter (optional)"
            rows={4}
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="mt-4"
          />
        </Modal>
      </Container>
    </main>
  );
}
