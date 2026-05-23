"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { DetailPageSkeleton } from "@/components/loading";
import { Badge, Button, Modal, Textarea, EmptyState } from "@/components/ui";
import { CompanyEvaluationPanel } from "@/components/companies/CompanyEvaluationPanel";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { createClient } from "@/lib/supabase/client";
import { formatInternshipDateRange } from "@/lib/internships/dates";
import type { ApplicationStatus } from "@/lib/types";

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
    start_date: string | null;
    end_date: string | null;
    additional_notes: string | null;
    location: string | null;
    type: string | null;
    is_active: boolean;
    created_at: string;
    company_id: string;
  } | null>(null);
  const [companyName, setCompanyName] = useState<string>("Company");
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);
  const [existingApplicationStatus, setExistingApplicationStatus] = useState<ApplicationStatus | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setExistingApplicationStatus(null);
      const { data: pos } = await supabase
        .from("internship_positions")
        .select("id, title, description, requirements, duration, start_date, end_date, additional_notes, location, type, is_active, created_at, company_id")
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
        .select("company_name, logo_url")
        .eq("id", pos.company_id)
        .single();
      setCompanyName(company?.company_name ?? "Company");
      setCompanyLogoUrl(company?.logo_url ?? null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role === "student") {
          const { data: student } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
          if (student?.id) {
            await invokeAutoCompleteExpiredTrainings(supabase);
            const { data: appRow } = await supabase
              .from("applications")
              .select("status")
              .eq("student_id", student.id)
              .eq("position_id", pos.id)
              .maybeSingle();
            if (appRow?.status) setExistingApplicationStatus(appRow.status as ApplicationStatus);
          }
        }
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

  const dateRangeLabel = useMemo(
    () => formatInternshipDateRange(position?.start_date, position?.end_date),
    [position?.start_date, position?.end_date]
  );

  const handleApply = async () => {
    if (!position) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("apply internship getUser error:", userError);
      setError("Unable to verify your account.");
      setSubmitting(false);
      return;
    }

    if (!user) {
      setError("Please log in first to apply.");
      setSubmitting(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("apply internship role check error:", profileError);
      setError("Unable to validate your role.");
      setSubmitting(false);
      return;
    }
    if (profile?.role && profile.role !== "student") {
      setError("Only students can apply to internships.");
      setSubmitting(false);
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (studentError) {
      console.error("apply internship student lookup error:", studentError);
    }

    if (!student) {
      setError("Student profile not found. Please complete your student profile first.");
      setSubmitting(false);
      return;
    }

    const applicationPayload = {
      student_id: student.id,
      position_id: position.id,
      message: coverLetter.trim() || null,
    };

    const { data: insertedApp, error: insertError } = await supabase
      .from("applications")
      .insert({
        ...applicationPayload,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You already applied to this internship.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    if (insertedApp?.id) {
      const { data: posMeta } = await supabase
        .from("internship_positions")
        .select("title, company_id")
        .eq("id", position.id)
        .maybeSingle();
      const { data: companyMeta } = posMeta?.company_id
        ? await supabase.from("companies").select("user_id, company_name").eq("id", posMeta.company_id).maybeSingle()
        : { data: null };

      const { data: applicantProfile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      const applicantName =
        applicantProfile?.full_name?.trim() ||
        user.email?.split("@")[0] ||
        "A student";

      if (companyMeta?.user_id) {
        const internshipTitle = posMeta?.title?.trim() || position.title;
        const { error: notifyErr } = await supabase.from("notifications").insert({
          user_id: companyMeta.user_id,
          title: "New application",
          message: `${applicantName} applied to “${internshipTitle}”.`,
          type: "new_application",
          is_read: false,
          related_application_id: insertedApp.id,
        });
        if (notifyErr) {
          console.error("notify company new application error:", notifyErr);
        }
      }
    }

    setSuccess("Application submitted successfully.");
    setExistingApplicationStatus("pending");
    setCoverLetter("");
    setApplyOpen(false);
    setSubmitting(false);
  };

  const applicationStatusBadgeVariant = (status: ApplicationStatus): "warning" | "success" | "danger" | "info" => {
    if (status === "accepted") return "success";
    if (status === "rejected") return "danger";
    if (status === "completed") return "info";
    return "warning";
  };

  const applicationStatusLabel = (status: ApplicationStatus): string => {
    if (status === "pending") return "Applied · Pending review";
    if (status === "accepted") return "Applied · Accepted";
    if (status === "rejected") return "Applied · Not selected";
    if (status === "completed") return "Applied · Completed";
    return "Applied";
  };

  if (loading) {
    return (
      <main className="py-8">
        <Container className="max-w-4xl">
          <DetailPageSkeleton />
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
    <main className="py-8 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{position.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-purple-100 text-xs font-bold text-purple-700 dark:bg-slate-800 dark:text-violet-300">
                {companyLogoUrl ? <img src={companyLogoUrl} alt="" className="h-full w-full object-cover" /> : companyName.slice(0, 1)}
              </span>
              <span>{companyName}</span>
            </div>
            <Badge variant="info" className="mt-2">
              {locationLabel[position.location ?? ""] ?? position.location ?? "On-site"}
            </Badge>
          </div>
          <div className="flex flex-col items-end gap-2">
            {existingApplicationStatus ? (
              <Badge variant={applicationStatusBadgeVariant(existingApplicationStatus)}>
                {applicationStatusLabel(existingApplicationStatus)}
              </Badge>
            ) : null}
            <Button
              variant="primary"
              onClick={() => setApplyOpen(true)}
              disabled={!position.is_active || Boolean(existingApplicationStatus)}
            >
              {existingApplicationStatus ? "Already applied" : "Apply"}
            </Button>
          </div>
        </div>

        <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-900">
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{position.description ?? "No description provided."}</p>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Required skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No specific requirements listed.</p>
              ) : (
                skills.map((s) => (
                <Badge key={s} variant="default" className="dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100">{s}</Badge>
                ))
              )}
            </div>
          </section>
          {position.additional_notes?.trim() ? (
            <section>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Additional information</h2>
              <p className="mt-2 whitespace-pre-wrap text-gray-600 dark:text-gray-300">{position.additional_notes}</p>
            </section>
          ) : null}
          <section className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Schedule</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {dateRangeLabel ?? position.duration ?? "Not specified"}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{position.type ?? "Not specified"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Posted</span>
              <p className="font-medium text-gray-900 dark:text-gray-100">{new Date(position.created_at).toLocaleDateString()}</p>
            </div>
          </section>
          <section className="rounded border border-gray-100 bg-gray-50/50 p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800/60">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Company</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{companyName}</p>
            <div className="mt-4">
              <CompanyEvaluationPanel companyId={position.company_id} variant="default" />
            </div>
          </section>
        </div>

        <p className="mt-4">
          <Link href="/internships" className="text-sm font-medium text-gray-900 hover:underline dark:text-gray-100">
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
          <p className="text-sm text-gray-600 dark:text-gray-300">Your profile will be sent to the company. Optionally add a cover letter below.</p>
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
