"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ApplicationTable from "@/components/applications/ApplicationTable";
import EmptyState from "@/components/common/EmptyState";
import { Button, Card, Modal, Select, Textarea } from "@/components/ui";
import type { Application } from "@/lib/types";

export default function ApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [evaluatedApplicationIds, setEvaluatedApplicationIds] = useState<Set<string>>(new Set());
  const [studentId, setStudentId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [ratingValue, setRatingValue] = useState("5");
  const [feedback, setFeedback] = useState("");
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
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
          .select("application_id")
          .eq("student_id", student.id)
          .in("application_id", applicationIds);

        const evaluatedIds = new Set(
          ((evaluationRows ?? []) as { application_id: string }[]).map((row) => row.application_id)
        );
        setEvaluatedApplicationIds(evaluatedIds);
      } else {
        setEvaluatedApplicationIds(new Set());
      }

      setApplications(mapped);
      setLoading(false);
    };

    load();
  }, []);

  const acceptedToRate = applications.filter((a) => a.status === "accepted" && a.company_id);
  const completedApplications = applications.filter((a) => a.status === "completed");

  const openRateModal = (app: Application) => {
    setSelectedApp(app);
    setRatingValue("5");
    setFeedback("");
    setError(null);
    setSuccess(null);
    setModalOpen(true);
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
      setEvaluatedApplicationIds((prev) => {
        const next = new Set(prev);
        next.add(selectedEvaluationApp.id);
        return next;
      });
      setError("Training evaluation already submitted for this application.");
      setSubmitting(false);
      setEvaluationModalOpen(false);
      return;
    }

    const { error: insertError } = await supabase.from("student_training_evaluations").insert({
      application_id: selectedEvaluationApp.id,
      student_id: studentId,
      overall_rating: Number(overallRating),
      mentorship_rating: Number(mentorshipRating),
      environment_rating: Number(environmentRating),
      skills_rating: Number(skillsRating),
      would_recommend: wouldRecommend === "yes",
      other_notes: otherNotes.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setEvaluatedApplicationIds((prev) => {
          const next = new Set(prev);
          next.add(selectedEvaluationApp.id);
          return next;
        });
        setError("Training evaluation already submitted for this application.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
    }

    setEvaluatedApplicationIds((prev) => {
      const next = new Set(prev);
      next.add(selectedEvaluationApp.id);
      return next;
    });
    setSuccess("Training evaluation submitted successfully.");
    setSubmitting(false);
    setEvaluationModalOpen(false);
  };

  const submitRating = async () => {
    if (!selectedApp || !studentId || !selectedApp.company_id) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    // Enforce accepted-only rating gate at app level before insert.
    const { data: acceptedApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("id", selectedApp.id)
      .eq("student_id", studentId)
      .eq("status", "accepted")
      .single();

    if (!acceptedApplication) {
      setError("You can only rate after your application is accepted.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("ratings").insert({
      student_id: studentId,
      company_id: selectedApp.company_id,
      position_id: selectedApp.position_id,
      rating: Number(ratingValue),
      feedback: feedback.trim() || null,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("You have already submitted a rating for this internship.");
      } else {
        setError(insertError.message);
      }
      setSubmitting(false);
      return;
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
              const submitted = evaluatedApplicationIds.has(app.id);
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">
                      {app.internship_title ?? "Internship"}
                    </p>
                    <p className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">
                      {submitted ? "Training evaluation submitted" : "Training evaluation available"}
                    </p>
                  </div>
                  {!submitted && (
                    <Button
                      variant="secondary"
                      className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      onClick={() => openEvaluationModal(app)}
                    >
                      Evaluate training
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-sm font-semibold text-gray-900 transition-colors duration-300 dark:text-white">Rate companies</h2>
        <p className="mt-1 text-sm text-gray-600 transition-colors duration-300 dark:text-slate-400">You can submit a rating only for accepted applications.</p>
        {acceptedToRate.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 transition-colors duration-300 dark:text-slate-400">No accepted applications available for rating yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {acceptedToRate.map((app) => (
              <div key={app.id} className="flex items-center justify-between rounded-md border border-gray-200 p-3 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-sm font-medium text-gray-900 transition-colors duration-300 dark:text-white">{app.internship_title ?? "Internship"}</p>
                  <p className="text-xs text-gray-500 transition-colors duration-300 dark:text-slate-400">Application accepted</p>
                </div>
                <Button
                  variant="secondary"
                  className="transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                  onClick={() => openRateModal(app)}
                >
                  Leave rating
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

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
