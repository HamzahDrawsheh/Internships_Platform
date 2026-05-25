"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { DetailPageSkeleton } from "@/components/loading";
import { Badge, Button, Modal, Textarea, EmptyState } from "@/components/ui";
import { CompanyEvaluationPanel } from "@/components/companies/CompanyEvaluationPanel";
import { SkillGapLearningPlanCard } from "@/components/students/SkillGapLearningPlanCard";
import { invokeAutoCompleteExpiredTrainings } from "@/lib/auto-complete-expired-trainings";
import { useI18n } from "@/lib/i18n/context";
import { analyzeSkillGapWithPlan, type SkillGapAnalysis } from "@/lib/skill-match";
import type { MatchScoreBreakdown } from "@/lib/recommendations/match-score-breakdown";
import { fetchStudentEnrolledInTraining } from "@/lib/applications/commitment";
import { createClient } from "@/lib/supabase/client";
import { formatInternshipDateRange } from "@/lib/internships/dates";
import type { ApplicationStatus } from "@/lib/types";
import { WorkArrangementBadge } from "@/components/internships/WorkArrangementBadge";
import { formatWorkArrangementLabel } from "@/lib/recommendations/location-prefs";

export default function InternshipDetailsPage() {
  const { t } = useI18n();
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
  const [companyOfficeLocation, setCompanyOfficeLocation] = useState<string | null>(null);
  const [existingApplicationStatus, setExistingApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [isEnrolledInTraining, setIsEnrolledInTraining] = useState(false);
  const [isStudentViewer, setIsStudentViewer] = useState(false);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [matchBreakdown, setMatchBreakdown] = useState<MatchScoreBreakdown | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setExistingApplicationStatus(null);
      setIsStudentViewer(false);
      setSkillGapAnalysis(null);
      setMatchBreakdown(null);
      setSkillGapLoading(false);
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
        .select("company_name, logo_url, location")
        .eq("id", pos.company_id)
        .single();
      setCompanyName(company?.company_name ?? "Company");
      setCompanyLogoUrl(company?.logo_url ?? null);
      setCompanyOfficeLocation(company?.location ?? null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role === "student") {
          setIsStudentViewer(true);
          setSkillGapLoading(true);
          const { data: student } = await supabase
            .from("students")
            .select("id, skills, major, department")
            .eq("user_id", user.id)
            .maybeSingle();
          if (student?.id) {
            await invokeAutoCompleteExpiredTrainings(supabase);
            const { data: appRow } = await supabase
              .from("applications")
              .select("status")
              .eq("student_id", student.id)
              .eq("position_id", pos.id)
              .maybeSingle();
            if (appRow?.status) setExistingApplicationStatus(appRow.status as ApplicationStatus);
            setIsEnrolledInTraining(await fetchStudentEnrolledInTraining(supabase, student.id));

            const { data: additional } = await supabase
              .from("student_additional_info")
              .select("technical_skills, soft_skills, taken_courses, custom_courses, preferred_field, gpa")
              .eq("user_id", user.id)
              .maybeSingle();

            const studentSources = {
              skills: student.skills,
              major: student.major,
              department: student.department,
              technical_skills: additional?.technical_skills ?? [],
              soft_skills: additional?.soft_skills ?? [],
              taken_courses: additional?.taken_courses ?? [],
              custom_courses: additional?.custom_courses ?? [],
              preferred_field: additional?.preferred_field ?? null,
            };

            setSkillGapAnalysis(
              analyzeSkillGapWithPlan(
                studentSources,
                {
                  requirements: pos.requirements,
                  description: pos.description,
                },
                t
              )
            );

            try {
              const matchRes = await fetch(`/api/recommendations/internships/${pos.id}`, {
                credentials: "same-origin",
              });
              if (matchRes.ok) {
                const body = (await matchRes.json()) as {
                  ok?: boolean;
                  match?: { score_breakdown?: MatchScoreBreakdown };
                };
                if (body.ok && body.match?.score_breakdown) {
                  setMatchBreakdown(body.match.score_breakdown);
                }
              }
            } catch {
              /* match breakdown is optional */
            }
          }
          setSkillGapLoading(false);
        }
      }

      setLoading(false);
    };

    if (id) load();
  }, [id, t]);

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

    const applyResponse = await fetch("/api/applications/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionId: position.id,
        message: coverLetter.trim() || null,
      }),
    });

    const applyBody = (await applyResponse.json()) as {
      ok: boolean;
      error?: string;
      code?: string;
      notificationWarning?: string;
    };

    if (!applyResponse.ok || !applyBody.ok) {
      if (applyBody.code === "already_applied" || applyResponse.status === 409) {
        setError(
          applyBody.code === "already_enrolled" || applyBody.code === "already_committed"
            ? (applyBody.error ??
                "You are already enrolled in a training opportunity and cannot apply elsewhere.")
            : "You already applied to this internship."
        );
      } else {
        setError(applyBody.error ?? "Failed to submit application.");
      }
      setSubmitting(false);
      return;
    }

    if (applyBody.notificationWarning) {
      console.warn("Application submitted; company notification issue:", applyBody.notificationWarning);
    }

    setSuccess("Application submitted successfully.");
    setExistingApplicationStatus("pending");
    setCoverLetter("");
    setApplyOpen(false);
    setSubmitting(false);
  };

  const applicationStatusBadgeVariant = (status: ApplicationStatus): "warning" | "success" | "danger" | "info" => {
    if (status === "accepted") return "success";
    if (status === "accepted_pending_commit") return "warning";
    if (status === "rejected" || status === "commitment_expired" || status === "withdrawn") return "danger";
    if (status === "completed") return "info";
    return "warning";
  };

  const applicationStatusLabel = (status: ApplicationStatus): string => {
    if (status === "pending") return "Applied · Pending review";
    if (status === "accepted_pending_commit") return "Accepted · Confirm within 3 days";
    if (status === "accepted") return "Applied · Accepted";
    if (status === "rejected") return "Applied · Not selected";
    if (status === "completed") return "Applied · Completed";
    if (status === "commitment_expired") return "Offer expired";
    if (status === "withdrawn") return "Withdrawn";
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
        {isEnrolledInTraining && !existingApplicationStatus ? (
          <div className="mb-4 rounded-md bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200" role="status">
            You are already enrolled in a training opportunity. You cannot apply to other internships until
            that placement is completed.
          </div>
        ) : null}
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
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {formatWorkArrangementLabel(position.location) ? (
                <WorkArrangementBadge location={position.location} />
              ) : (
                <Badge variant="default">Work arrangement not specified</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {existingApplicationStatus ? (
              <Badge variant={applicationStatusBadgeVariant(existingApplicationStatus)}>
                {applicationStatusLabel(existingApplicationStatus)}
              </Badge>
            ) : isEnrolledInTraining ? (
              <Badge variant="success">Enrolled in training</Badge>
            ) : null}
            <Button
              variant="primary"
              onClick={() => setApplyOpen(true)}
              disabled={!position.is_active || Boolean(existingApplicationStatus) || isEnrolledInTraining}
            >
              {existingApplicationStatus
                ? "Already applied"
                : isEnrolledInTraining
                  ? "Already enrolled"
                  : "Apply"}
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
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Work arrangement</span>
              <div className="mt-1.5">
                <WorkArrangementBadge location={position.location} />
                {!formatWorkArrangementLabel(position.location) ? (
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Not specified</p>
                ) : null}
              </div>
            </div>
            {companyOfficeLocation?.trim() ? (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Office / city</span>
                <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{companyOfficeLocation}</p>
              </div>
            ) : null}
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Schedule</span>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                {dateRangeLabel ?? position.duration ?? "Not specified"}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Posted</span>
              <p className="mt-1 font-medium text-gray-900 dark:text-gray-100">{new Date(position.created_at).toLocaleDateString()}</p>
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

        {isStudentViewer && skillGapAnalysis && (
          <div className="mt-6">
            <SkillGapLearningPlanCard
              loading={skillGapLoading}
              analysis={skillGapAnalysis}
              breakdown={matchBreakdown}
            />
          </div>
        )}

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
