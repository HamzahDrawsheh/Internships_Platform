"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Badge, Button, Modal, Textarea } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Internship } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";

const locationLabel: Record<string, string> = { remote: "Remote", onsite: "On-site", hybrid: "Hybrid" };

export default function InternshipDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const { role, loading: authLoading } = useAuth();

  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Invalid internship id.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<Internship>(`/internships/${id}`)
      .then((data) => {
        if (!cancelled) {
          setInternship(data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Internship not found.");
        } else {
          setError("Failed to load internship. Please try again later.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleApply = async () => {
    if (!id || !internship) return;
    setSubmitting(true);
    setApplyError(null);
    setApplySuccess(null);

    try {
      await api.post(`/internships/${id}/applications`, {
        cover_letter: coverLetter.trim() || undefined,
      });
      setApplySuccess("Application submitted successfully.");
      setApplyOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          const next = encodeURIComponent(`/internships/${id}`);
          router.push(`/auth/login?next=${next}`);
          return;
        }
        if (err.status === 409) {
          setApplyError("You have already applied to this internship.");
          return;
        }
        setApplyError(err.message || "Failed to submit application.");
      } else {
        setApplyError("Failed to submit application.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isStudent = role === "student";

  const title = internship?.title ?? "Internship";
  const companyName = internship?.company_name ?? internship?.company_id ?? "Company";
  const locationType = internship?.location_type ?? null;
  const skills = internship?.skills ?? [];
  const durationWeeks = internship?.duration_weeks ?? null;
  const startDate = internship?.start_date ?? null;
  const deadline = internship?.deadline ?? null;
  const openPositions = internship?.open_positions ?? null;

  return (
    <main className="py-8">
      <Container className="max-w-4xl">
        {loading ? (
          <p className="text-gray-600">Loading internship…</p>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : internship ? (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="mt-1 text-gray-600">{companyName}</p>
                {locationType && (
                  <Badge variant="info" className="mt-2">
                    {locationLabel[locationType] ?? locationType}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary">Bookmark</Button>
                {isStudent && !authLoading && (
                  <Button variant="primary" onClick={() => setApplyOpen(true)}>
                    Apply
                  </Button>
                )}
              </div>
            </div>

            {applySuccess && (
              <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {applySuccess}
              </div>
            )}

            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6">
              <section>
                <h2 className="text-sm font-semibold text-gray-900">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-gray-600">
                  {internship.description || "No description provided."}
                </p>
              </section>
              <section>
                <h2 className="text-sm font-semibold text-gray-900">Required skills</h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.length === 0 ? (
                    <span className="text-sm text-gray-500">No specific skills listed.</span>
                  ) : (
                    skills.map((s) => (
                      <Badge key={s} variant="default">
                        {s}
                      </Badge>
                    ))
                  )}
                </div>
              </section>
              <section className="grid gap-4 sm:grid-cols-3">
                <div>
                  <span className="text-sm text-gray-500">Duration</span>
                  <p className="font-medium text-gray-900">
                    {durationWeeks != null ? `${durationWeeks} weeks` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Start date</span>
                  <p className="font-medium text-gray-900">
                    {startDate ? new Date(startDate).toLocaleDateString() : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Deadline</span>
                  <p className="font-medium text-gray-900">
                    {deadline ? new Date(deadline).toLocaleDateString() : "—"}
                  </p>
                </div>
              </section>
              <section className="rounded border border-gray-100 bg-gray-50/50 p-4">
                <h2 className="text-sm font-semibold text-gray-900">Company</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {companyName} — Open positions: {openPositions ?? "—"}
                </p>
              </section>
            </div>
          </>
        ) : null}

        <p className="mt-4">
          <Link href="/internships" className="text-sm font-medium text-gray-900 hover:underline">
            ← Back to listings
          </Link>
        </p>

        <Modal
          isOpen={applyOpen}
          onClose={() => {
            if (!submitting) setApplyOpen(false);
          }}
          title="Apply for this internship"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setApplyOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApply} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </>
          }
        >
          {applyError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
              {applyError}
            </div>
          )}
          <p className="text-sm text-gray-600">
            Your profile will be sent to the company. Optionally add a cover letter below.
          </p>
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
