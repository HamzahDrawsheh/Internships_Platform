"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchCompanyStudentFeedbacks,
  type CompanyStudentFeedback,
} from "@/lib/companies/feedbacks";

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const clamped = Math.max(0, Math.min(max, value));
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${clamped} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < Math.round(clamped) ? "fill-current" : "fill-none stroke-current opacity-30"}`}
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function formatFeedbackDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function FeedbackCard({ feedback }: { feedback: CompanyStudentFeedback }) {
  const displayRating = feedback.avg_rating ?? feedback.overall_rating;
  const hasBreakdown =
    feedback.source === "training" &&
    feedback.mentorship_rating != null &&
    feedback.environment_rating != null &&
    feedback.skills_rating != null;

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">Anonymous student</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatFeedbackDate(feedback.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={displayRating} />
          <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            {displayRating.toFixed(1)} / 5
          </span>
        </div>
      </div>

      {hasBreakdown ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Overall</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{feedback.overall_rating} / 5</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Mentorship</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{feedback.mentorship_rating} / 5</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Environment</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{feedback.environment_rating} / 5</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Skills gained</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-200">{feedback.skills_rating} / 5</dd>
          </div>
        </dl>
      ) : null}

      {feedback.would_recommend != null ? (
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-white">Would recommend: </span>
          {feedback.would_recommend ? "Yes" : "No"}
        </p>
      ) : null}

      {feedback.other_notes ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {feedback.other_notes}
          </p>
        </div>
      ) : null}
    </article>
  );
}

type Props = {
  companyId: string;
  className?: string;
};

export function CompanyStudentFeedbacks({ companyId, className = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbacks, setFeedbacks] = useState<CompanyStudentFeedback[]>([]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setFeedbacks([]);

      const trimmed = companyId.trim();
      if (!trimmed) {
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { feedbacks: rows, error: err } = await fetchCompanyStudentFeedbacks(supabase, trimmed);
      if (cancelled) return;

      setFeedbacks(rows);
      setError(err);
      setLoading(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (loading) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 ${className}`}
        role="status"
        aria-live="polite"
      >
        Loading student feedback…
      </div>
    );
  }

  if (error) {
    return (
      <p className={`text-sm text-amber-700 dark:text-amber-300 ${className}`} role="alert">
        Student feedback unavailable right now.
      </p>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-800/30 ${className}`}
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">No student feedback yet.</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
          Reviews appear after students complete internships and submit evaluations.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {feedbacks.length} student review{feedbacks.length === 1 ? "" : "s"}
      </p>
      {feedbacks.map((feedback) => (
        <FeedbackCard key={feedback.id} feedback={feedback} />
      ))}
    </div>
  );
}
