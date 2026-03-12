"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import InternshipForm, {
  type InternshipFormValues,
} from "@/components/internships/InternshipForm";
import { Button } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function CreateInternshipPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const body = buildPayload(values, "active");
      if (!body.title || !body.description) {
        setErrorMessage("Title and description are required.");
        setSubmitting(false);
        return;
      }
      await api.post("/internships", body);
      router.push("/company/internships");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || "Failed to create internship.");
      } else {
        setErrorMessage("Failed to create internship.");
      }
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async (values: InternshipFormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const body = buildPayload(values, "draft");
      if (!body.title || !body.description) {
        setErrorMessage("Title and description are required.");
        setSubmitting(false);
        return;
      }
      await api.post("/internships", body);
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
          title="Create Internship"
          description="Add a new internship listing. Save as draft or publish."
          action={
            <Link href="/company/internships">
              <Button variant="secondary">Cancel</Button>
            </Link>
          }
        />
        <InternshipForm
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          submitLabel="Publish"
          submitting={submitting}
          errorMessage={errorMessage}
        />
      </Container>
    </main>
  );
}
