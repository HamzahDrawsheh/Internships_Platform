"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import EmptyState from "@/components/common/EmptyState";
import { Button, Card, Modal, Select, Textarea } from "@/components/ui";
import type { Application } from "@/lib/types";

type TrainingEvaluationSummary = {
  overall_rating: number;
  mentorship_rating: number;
  environment_rating: number;
  skills_rating: number;
  would_recommend: boolean;
  other_notes: string | null;
  created_at: string;
};

type CompanyRatingSummary = {
  rating: number;
  feedback: string | null;
  created_at: string;
};

/** Calls server-side analysis only; failures are logged and never thrown. */
async function requestFeedbackAnalysis(feedbackId: string): Promise<void> {
  try {
    const res = await fetch("/api/feedback/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback_id: feedbackId }),
    });
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore invalid JSON
    }
    const record = payload as { ok?: boolean; error?: unknown } | null;
    const ok = res.ok && record?.ok === true;
    if (!ok) {
      const msg =
        record?.error != null ? String(record.error) : `${res.status} ${res.statusText}`;
      console.error("[ApplicationsList] Feedback AI analysis failed:", msg);
    }
  } catch (err) {
    console.error("[ApplicationsList] Feedback AI analysis request error:", err);
  }
}

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  /** Completed applications that already have a row in student_training_evaluations */
  const [trainingEvaluationByAppId, setTrainingEvaluationByAppId] = useState<
    Record<string, TrainingEvaluationSummary>
  >({});
  /** Matches ratings.unique(student_id, company_id, position_id) to each application row */
  const [ratingByApplicationId, setRatingByApplicationId] = useState<
    Record<string, CompanyRatingSummary>
  >({});
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [ratingValue, setRatingValue] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [evaluationViewModalOpen, setEvaluationViewModalOpen] = useState(false);
  const [viewEvaluationApplicationId, setViewEvaluationApplicationId] = useState<string | null>(null);
  const [ratingViewModalOpen, setRatingViewModalOpen] = useState(false);
  const [viewRatingApplicationId, setViewRatingApplicationId] = useState<string | null>(null);
  const [selectedEvaluationApp, setSelectedEvaluationApp] = useState<Application | null>(null);
  const [overallRating, setOverallRating] = useState("5");
  const [mentorshipRating, setMentorshipRating] = useState("5");
  const [environmentRating, setEnvironmentRating] = useState("5");
  const [skillsRating, setSkillsRating] = useState("5");
  const [wouldRecommend, setWouldRecommend] = useState("yes");
  const [otherNotes, setOtherNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!student) {
        setApplications([]);
        setLoading(false);
        return;
      }
      setStudentId(student.id);

      const { data: appRows, error: appError } = await supabase
        .from("applications")
        .select("id, student_id, position_id, status, message, applied_at")
        .eq("student_id", student.id)
        .order("applied_at", { ascending: false });

      if (appError || !appRows?.length) {
        setApplications([]);
        setRatingByApplicationId({});
        setLoading(false);
        return;
      }

      const positionIds = [...new Set(appRows.map((row) => row.position_id))];
      const { data: positions } = await supabase
        .from("internship_positions")
        .select("id, title, company_id")
        .in("id", positionIds);

      const positionsById = new Map((positions ?? []).map((p) => [p.id, p]));

      const mapped: Application[] = appRows.map((row) => {
        const pos = positionsById.get(row.position_id);
        return {
          id: row.id,
          student_id: row.student_id,
          position_id: row.position_id,
          company_id: pos?.company_id,
          status: row.status,
          message: row.message,
          applied_at: row.applied_at,
          internship_title: pos?.title ?? null,
          company_name: undefined,
        };
      });

      const applicationIds = mapped.map((app) => app.id);
      if (applicationIds.length > 0) {
        const { data: evaluationRows } = await supabase
          .from("student_training_evaluations")
          .select(
            "application_id, overall_rating, mentorship_rating, environment_rating, skills_rating, would_recommend, other_notes, created_at"
          )
          .eq("student_id", student.id)
          .in("application_id", applicationIds);

        const byApp: Record<string, TrainingEvaluationSummary> = {};
        for (const row of (evaluationRows ?? []) as {
          application_id: string;
          overall_rating: number;
          mentorship_rating: number;
          environment_rating: number;
          skills_rating: number;
          would_recommend: boolean;
          other_notes: string | null;
          created_at: string;
        }[]) {
          byApp[row.application_id] = {
            overall_rating: row.overall_rating,
            mentorship_rating: row.mentorship_rating,
            environment_rating: row.environment_rating,
            skills_rating: row.skills_rating,
            would_recommend: row.would_recommend,
            other_notes: row.other_notes,
            created_at: row.created_at,
          };
        }
        setTrainingEvaluationByAppId(byApp);
      } else {
        setTrainingEvaluationByAppId({});
      }

      const { data: ratingRows } = await supabase
        .from("ratings")
        .select("company_id, position_id, rating, feedback, created_at")
        .eq("student_id", student.id);

      const ratingByApp: Record<string, CompanyRatingSummary> = {};
      for (const app of mapped) {
        if (!app.company_id || !app.position_id) continue;
        const row = (ratingRows ?? []).find(
          (r) => r.company_id === app.company_id && r.position_id === app.position_id
        );
        if (row) {
          ratingByApp[app.id] = {
            rating: row.rating as number,
            feedback: row.feedback as string | null,
            created_at: row.created_at as string,
          };
        }
      }
      setRatingByApplicationId(ratingByApp);

      setApplications(mapped);
      setLoading(false);
    };

    load();
  }, []);

  const rateableApplications = applications.filter(
    (a) => (a.status === "accepted" || a.status === "completed") && a.company_id
  );
  const completedApplications = applications.filter((a) => a.status === "completed");

  const openRateModal = (app: Application) => {
    setSelectedApp(app);
    setRatingValue("5");
    setFeedback("");
    setError(null);
    setSuccess(null);
    setModalOpen(true);
  };

  const summaryFromForm = (): TrainingEvaluationSummary => ({
    overall_rating: Number(overallRating),
    mentorship_rating: Number(mentorshipRating),
    environment_rating: Number(environmentRating),
    skills_rating: Number(skillsRating),
    would_recommend: wouldRecommend === "yes",
    other_notes: otherNotes.trim() || null,
    created_at: new Date().toISOString(),
  });

  const openViewEvaluationModal = (applicationId: string) => {
    if (!trainingEvaluationByAppId[applicationId]) return;
    setViewEvaluationApplicationId(applicationId);
    setEvaluationViewModalOpen(true);
  };

  const openViewRatingModal = (applicationId: string) => {
    if (!ratingByApplicationId[applicationId]) return;
    setViewRatingApplicationId(applicationId);
    setRatingViewModalOpen(true);
  };

  const openEvaluationModal = (app: Application) => {
    setSelectedEvaluationApp(app);
    setOverallRating("5");
    setMentorshipRating("5");
    setEnvironmentRating("5");
    setSkillsRating("5");
    setWouldRecommend("yes");
    setOtherNotes("");
    setError(null);
    setSuccess(null);
    setEvaluationModalOpen(true);
  };

  const submitTrainingEvaluation = async () => {
    if (!selectedEvaluationApp || !studentId) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    // Defensive check: application must still be completed and owned by this student.
    const { data: completedApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("id", selectedEvaluationApp.id)
      .eq("student_id", studentId)
      .eq("status", "completed")
      .single();

    if (!completedApplication) {
      setError("Training evaluation is available only for completed applications.");
      setSubmitting(false);
      return;
    }

    // Defensive check: no prior evaluation for this application.
    const { data: existingEvaluation } = await supabase
      .from("student_training_evaluations")
      .select("id")
      .eq("application_id", selectedEvaluationApp.id)
      .maybeSingle();

    if (existingEvaluation) {
      const { data: existingRow } = await supabase
        .from("student_training_evaluations")
        .select(
          "overall_rating, mentorship_rating, environment_rating, skills_rating, would_recommend, other_notes, created_at"
        )
        .eq("application_id", selectedEvaluationApp.id)
        .maybeSingle();

      if (existingRow) {
        setTrainingEvaluationByAppId((prev) => ({
          ...prev,
          [selectedEvaluationApp.id]: {
            overall_rating: existingRow.overall_rating as number,
            mentorship_rating: existingRow.mentorship_rating as number,
            environment_rating: existingRow.environment_rating as number,
            skills_rating: existingRow.skills_rating as number,
            would_recommend: existingRow.would_recommend as boolean,
            other_notes: existingRow.other_notes as string | null,
            created_at: existingRow.created_at as string,
          },
        }));
      }

      setError("Training evaluation already submitted for this application.");
      setSubmitting(false);
      setEvaluationModalOpen(false);
      return;
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("student_training_evaluations")
      .insert({
        application_id: selectedEvaluationApp.id,
        student_id: studentId,
        overall_rating: Number(overallRating),
        mentorship_rating: Number(mentorshipRating),
        environment_rating: Number(environmentRating),
        skills_rating: Number(skillsRating),
        would_recommend: wouldRecommend === "yes",
        other_notes: otherNotes.trim() || null,
      })
      .select("id")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: dupRow } = await supabase
          .from("student_training_evaluations")
          .select(
            "overall_rating, mentorship_rating, environment_rating, skills_rating, would_recommend, other_notes, created_at"
          )
          .eq("application_id", selectedEvaluationApp.id)
          .maybeSingle();
        if (dupRow) {
          setTrainingEvaluationByAppId((prev) => ({
            ...prev,
            [selectedEvaluationApp.id]: {
              overall_rating: dupRow.overall_rating as number,
              mentorship_rating: dupRow.mentorship_rating as number,
              environment_rating: dupRow.environment_rating as number,
              skills_rating: dupRow.skills_rating as number,
              would_recommend: dupRow.would_recommend as boolean,
              other_notes: dupRow.other_notes as string | null,
              created_at: dupRow.created_at as string,
            },
          }));
        }
        setError("Training evaluation already submitted for this application.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    const feedbackId = insertedRow?.id;
    if (!feedbackId) {
      console.error("[ApplicationsList] Insert succeeded but no feedback id returned.");
    }

    setTrainingEvaluationByAppId((prev) => ({
      ...prev,
      [selectedEvaluationApp.id]: summaryFromForm(),
    }));
    setSuccess("Training evaluation submitted successfully.");
    setSubmitting(false);
    setEvaluationModalOpen(false);

    if (feedbackId) {
      void requestFeedbackAnalysis(feedbackId);
    }
  };

  const submitRating = async () => {
    if (!selectedApp || !studentId || !selectedApp.company_id) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    // Enforce accepted-or-completed rating gate at app level before insert.
    const { data: rateableApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("id", selectedApp.id)
      .eq("student_id", studentId)
      .in("status", ["accepted", "completed"])
      .maybeSingle();

    if (!rateableApplication) {
      setError("You can only rate after your application is accepted or completed.");
      setSubmitting(false);
      return;
    }

    const { data: insertedRow, error: insertError } = await supabase
      .from("ratings")
      .insert({
        student_id: studentId,
        company_id: selectedApp.company_id,
        position_id: selectedApp.position_id,
        rating: Number(ratingValue),
        feedback: feedback.trim() || null,
      })
      .select("rating, feedback, created_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You have already submitted a rating for this internship.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    if (insertedRow) {
      const summary: CompanyRatingSummary = {
        rating: insertedRow.rating as number,
        feedback: insertedRow.feedback as string | null,
        created_at: insertedRow.created_at as string,
      };
      setRatingByApplicationId((prev) => {
        const next = { ...prev };
        for (const app of applications) {
          if (
            app.company_id === selectedApp.company_id &&
            app.position_id === selectedApp.position_id
          ) {
            next[app.id] = summary;
          }
        }
        return next;
      });
    }

    setSuccess("Rating submitted successfully.");
    setSubmitting(false);
    setModalOpen(false);
  };

  if (loading) return <p className="text-gray-600 transition-colors duration-300 dark:text-slate-400">Loading…</p>;
  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Apply to internships to see them here."
        actionLabel="Browse internships"
        actionHref="/internships"
      />
    );
  }
  return (
    <>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 transition-colors duration-300 dark:border dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 transition-colors duration-300 dark:border dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300" role="status">
          {success}
        </div>
      )}
      <ApplicationTable applications={applications} showViewAction />

      {completedApplications.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">
            Training evaluation status
          </h2>
          <div className="mt-4 space-y-3">
            {completedApplications.map((app) => {
              const existingEvaluation = trainingEvaluationByAppId[app.id];
              const submitted = Boolean(existingEvaluation);
              return (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">
                      {app.internship_title ?? "Internship"}
                    </p>
                    <p className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      {submitted ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                          Evaluation submitted
                          <span aria-hidden="true">✅</span>
                        </span>
                      ) : (
                        "Complete your training evaluation while details are fresh."
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {submitted ? (
                      <Button
                        variant="secondary"
                        className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                        onClick={() => openViewEvaluationModal(app.id)}
                      >
                        View Evaluation
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                        onClick={() => openEvaluationModal(app)}
                      >
                        Evaluate Training
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Rate companies</h2>
        <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">
          You can submit a rating for accepted or completed applications.
        </p>
        {rateableApplications.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">
            No accepted or completed applications available for rating yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rateableApplications.map((app) => {
              const existingRating = ratingByApplicationId[app.id];
              const submitted = Boolean(existingRating);
              return (
                <div
                  key={app.id}
                  className="flex flex-col gap-3 rounded-md border border-gray-200 p-3 transition-colors duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">
                      {app.internship_title ?? "Internship"}
                    </p>
                    <p className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      {submitted ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                          Rating submitted
                          <span aria-hidden="true">✅</span>
                        </span>
                      ) : app.status === "completed" ? (
                        "Internship completed — eligible to rate"
                      ) : (
                        "Application accepted — eligible to rate"
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {submitted ? (
                      <Button
                        variant="secondary"
                        className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                        onClick={() => openViewRatingModal(app.id)}
                      >
                        View Rating
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                        onClick={() => openRateModal(app)}
                      >
                        Leave rating
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        isOpen={ratingViewModalOpen}
        onClose={() => {
          setRatingViewModalOpen(false);
          setViewRatingApplicationId(null);
        }}
        title="Your company rating"
        footer={
          <Button
            variant="secondary"
            className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            onClick={() => {
              setRatingViewModalOpen(false);
              setViewRatingApplicationId(null);
            }}
          >
            Close
          </Button>
        }
      >
        {viewRatingApplicationId &&
          (() => {
            const r = ratingByApplicationId[viewRatingApplicationId];
            const app = applications.find((a) => a.id === viewRatingApplicationId);
            if (!r) return <p className="text-sm text-gray-600 dark:text-slate-400">No rating data.</p>;
            const submittedAt = new Date(r.created_at);
            const dateLabel = Number.isNaN(submittedAt.getTime())
              ? "—"
              : submittedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
            return (
              <div className="space-y-4 text-sm text-gray-800 dark:text-slate-200">
                {app?.internship_title && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-white">Internship: </span>
                    {app.internship_title}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-slate-400">Submitted {dateLabel}</p>
                <p>
                  <span className="font-medium text-gray-900 dark:text-white">Overall rating: </span>
                  {r.rating} / 5
                </p>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Feedback</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    {r.feedback?.trim() ? r.feedback : "—"}
                  </p>
                </div>
              </div>
            );
          })()}
      </Modal>

      <Modal
        isOpen={evaluationViewModalOpen}
        onClose={() => {
          setEvaluationViewModalOpen(false);
          setViewEvaluationApplicationId(null);
        }}
        title="Your training evaluation"
        footer={
          <Button
            variant="secondary"
            className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            onClick={() => {
              setEvaluationViewModalOpen(false);
              setViewEvaluationApplicationId(null);
            }}
          >
            Close
          </Button>
        }
      >
        {viewEvaluationApplicationId &&
          (() => {
            const ev = trainingEvaluationByAppId[viewEvaluationApplicationId];
            const app = applications.find((a) => a.id === viewEvaluationApplicationId);
            if (!ev) return <p className="text-sm text-gray-600 dark:text-slate-400">No evaluation data.</p>;
            const submittedAt = new Date(ev.created_at);
            const dateLabel = Number.isNaN(submittedAt.getTime())
              ? "—"
              : submittedAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
            return (
              <div className="space-y-4 text-sm text-gray-800 dark:text-slate-200">
                {app?.internship_title && (
                  <p>
                    <span className="font-medium text-gray-900 dark:text-white">Internship: </span>
                    {app.internship_title}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-slate-400">Submitted {dateLabel}</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Overall</dt>
                    <dd>{ev.overall_rating} / 5</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Mentorship</dt>
                    <dd>{ev.mentorship_rating} / 5</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Environment</dt>
                    <dd>{ev.environment_rating} / 5</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">Skills gained</dt>
                    <dd>{ev.skills_rating} / 5</dd>
                  </div>
                </dl>
                <p>
                  <span className="font-medium text-gray-900 dark:text-white">Recommend this training: </span>
                  {ev.would_recommend ? "Yes" : "No"}
                </p>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Other notes</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
                    {ev.other_notes?.trim() ? ev.other_notes : "—"}
                  </p>
                </div>
              </div>
            );
          })()}
      </Modal>

      <Modal
        isOpen={evaluationModalOpen}
        onClose={() => setEvaluationModalOpen(false)}
        title="Submit training evaluation"
        footer={
          <>
            <Button
              variant="secondary"
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              onClick={() => setEvaluationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={submitTrainingEvaluation} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit evaluation"}
            </Button>
          </>
        }
      >
        <Select
          label="Overall rating (1 to 5)"
          value={overallRating}
          onChange={(e) => setOverallRating(e.target.value)}
          options={[
            { value: "5", label: "5 - Excellent" },
            { value: "4", label: "4 - Good" },
            { value: "3", label: "3 - Average" },
            { value: "2", label: "2 - Poor" },
            { value: "1", label: "1 - Very poor" },
          ]}
        />
        <Select
          label="Mentorship rating (1 to 5)"
          value={mentorshipRating}
          onChange={(e) => setMentorshipRating(e.target.value)}
          options={[
            { value: "5", label: "5 - Excellent" },
            { value: "4", label: "4 - Good" },
            { value: "3", label: "3 - Average" },
            { value: "2", label: "2 - Poor" },
            { value: "1", label: "1 - Very poor" },
          ]}
          className="mt-4"
        />
        <Select
          label="Environment rating (1 to 5)"
          value={environmentRating}
          onChange={(e) => setEnvironmentRating(e.target.value)}
          options={[
            { value: "5", label: "5 - Excellent" },
            { value: "4", label: "4 - Good" },
            { value: "3", label: "3 - Average" },
            { value: "2", label: "2 - Poor" },
            { value: "1", label: "1 - Very poor" },
          ]}
          className="mt-4"
        />
        <Select
          label="Skills gain rating (1 to 5)"
          value={skillsRating}
          onChange={(e) => setSkillsRating(e.target.value)}
          options={[
            { value: "5", label: "5 - Excellent" },
            { value: "4", label: "4 - Good" },
            { value: "3", label: "3 - Average" },
            { value: "2", label: "2 - Poor" },
            { value: "1", label: "1 - Very poor" },
          ]}
          className="mt-4"
        />
        <Select
          label="Would you recommend this training?"
          value={wouldRecommend}
          onChange={(e) => setWouldRecommend(e.target.value)}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          className="mt-4"
        />
        <Textarea
          label="Other notes"
          rows={4}
          value={otherNotes}
          onChange={(e) => setOtherNotes(e.target.value)}
          className="mt-4"
          placeholder="Share any additional notes about your training..."
        />
      </Modal>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit company rating"
        footer={
          <>
            <Button
              variant="secondary"
              className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={submitRating} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit rating"}
            </Button>
          </>
        }
      >
        <Select
          label="Rating (1 to 5)"
          value={ratingValue}
          onChange={(e) => setRatingValue(e.target.value)}
          options={[
            { value: "5", label: "5 - Excellent" },
            { value: "4", label: "4 - Good" },
            { value: "3", label: "3 - Average" },
            { value: "2", label: "2 - Poor" },
            { value: "1", label: "1 - Very poor" },
          ]}
        />
        <Textarea
          label="Feedback"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mt-4"
          placeholder="Share your internship experience..."
        />
      </Modal>
    </>
  );
}
