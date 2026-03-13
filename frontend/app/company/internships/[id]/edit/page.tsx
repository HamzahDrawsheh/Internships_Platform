"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import InternshipForm, {
  type InternshipFormValues,
} from "@/components/internships/InternshipForm";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import type { Internship } from "@/lib/types";

export default function EditInternshipPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const hasValidId = Boolean(id);

  const [initialValues, setInitialValues] = useState<Partial<InternshipFormValues> | null>(null);
  const [loading, setLoading] = useState(hasValidId);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    hasValidId ? null : "Invalid internship id."
  );

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;

    api
      .get<Internship>(`/internships/${id}`)
      .then((internship) => {
        if (cancelled) return;
        const values: Partial<InternshipFormValues> = {
          title: internship.title ?? "",
          description: internship.description ?? "",
          locationType: internship.location_type ?? "hybrid",
          skills: (internship.skills ?? []).join(", "),
          durationWeeks: internship.duration_weeks != null ? String(internship.duration_weeks) : "",
          startDate: internship.start_date ?? "",
          deadline: internship.deadline ?? "",
          openPositions: String(internship.open_positions ?? 1),
        };
        setInitialValues(values);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setErrorMessage("Internship not found.");
        } else {
          setErrorMessage("Failed to load internship. Please try again later.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const buildPayload = (values: InternshipFormValues, status: "draft" | "active") => {
    const openPositions = parseInt(values.openPositions, 10);
    return {
      title: values.title.trim(),
      description: values.description.trim(),
      location_type: values.locationType,
      skills: values.skills
        ? values.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      duration_weeks: values.durationWeeks ? parseInt(values.durationWeeks, 10) : null,
      start_date: values.startDate || null,
      deadline: values.deadline || null,
      open_positions: Number.isFinite(openPositions) && openPositions > 0 ? openPositions : 1,
      status,
    };
  };

  const handleSubmit = async (values: InternshipFormValues) => {
    if (!id) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const body = buildPayload(values, "active");
      if (!body.title || !body.description) {
        setErrorMessage("Title and description are required.");
        setSubmitting(false);
        return;
      }
      await api.patch(`/internships/${id}`, body);
      router.push("/company/internships");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to update internship.");
      } else {
        setErrorMessage("Failed to update internship.");
      }
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async (values: InternshipFormValues) => {
    if (!id) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const body = buildPayload(values, "draft");
      if (!body.title || !body.description) {
        setErrorMessage("Title and description are required.");
        setSubmitting(false);
        return;
      }
      await api.patch(`/internships/${id}`, body);
      router.push("/company/internships");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to save draft.");
      } else {
        setErrorMessage("Failed to save draft.");
      }
      setSubmitting(false);
    }
  };

  return (
    <main className="py-8">
      <Container className="max-w-2xl">
        <PageHeader
          title="Edit Internship"
          description={id ? "Editing internship" : "Edit internship listing."}
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Cancel</Button>
            </Link>
          }
        />
        {loading ? (
          <p className="mt-6 text-sm text-gray-600">Loading internship…</p>
        ) : (
          <InternshipForm
            initialValues={initialValues ?? undefined}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            submitLabel="Update"
            submitting={submitting}
            errorMessage={errorMessage}
          />
        )}
      </Container>
    </main>
  );
}
