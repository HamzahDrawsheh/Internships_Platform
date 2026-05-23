"use client";

import { useEffect, useState } from "react";
import {
  fetchCompanyEvaluation,
  formatOverallScore,
  isCompanyPubliclyEvaluated,
  type CompanyEvaluationSummary,
} from "@/lib/companies/evaluation";
import { createClient } from "@/lib/supabase/client";

export type { CompanyEvaluationSummary } from "@/lib/companies/evaluation";
export { fetchCompanyEvaluation, parseCompanyEvaluationRpc } from "@/lib/companies/evaluation";

function levelBadgeClasses(level: "white" | "gray" | "black"): string {
  switch (level) {
    case "white":
      return "border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-500/15 dark:text-emerald-100";
    case "gray":
      return "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100";
    case "black":
      return "border-red-900/80 bg-red-950 text-red-50 dark:border-red-800 dark:bg-red-950 dark:text-red-100";
    default:
      return "border-slate-200 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
  }
}

function levelLabel(level: "white" | "gray" | "black"): string {
  switch (level) {
    case "white":
      return "White Level";
    case "gray":
      return "Gray Level";
    case "black":
      return "Black Level";
  }
}

function NewCompanyBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-sky-300/80 bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:border-sky-500/50 dark:bg-sky-500/15 dark:text-sky-100 ${className}`}
    >
      New Company
    </span>
  );
}

export function CompanyEvaluationDisplay({
  loading,
  error,
  summary,
  variant = "default",
  className = "",
}: {
  loading?: boolean;
  error?: string | null;
  summary: CompanyEvaluationSummary | null;
  variant?: "default" | "compact";
  className?: string;
}) {
  if (loading) {
    return (
      <div
        className={`rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 ${className}`}
        role="status"
        aria-live="polite"
      >
        Loading company evaluation…
      </div>
    );
  }

  if (error) {
    return (
      <p className={`text-sm text-amber-700 dark:text-amber-300 ${className}`} role="alert">
        Evaluation unavailable
      </p>
    );
  }

  const showPublicEval = isCompanyPubliclyEvaluated(summary);
  const isNew = summary?.is_new_company !== false;

  if (!showPublicEval) {
    if (variant === "compact") {
      return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
          {isNew && <NewCompanyBadge />}
          <span className="text-xs text-slate-500 dark:text-slate-400">Not enough evaluation data yet</span>
        </div>
      );
    }

    return (
      <div
        className={`rounded-xl border border-sky-200/80 bg-sky-50/60 p-4 dark:border-sky-800/60 dark:bg-sky-950/30 ${className}`}
      >
        {isNew && <NewCompanyBadge />}
        <p className={`text-sm text-slate-600 dark:text-slate-300 ${isNew ? "mt-3" : ""}`}>
          Not enough evaluation data yet
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
          {isNew
            ? "Rankings and scores appear after the company posts internships and accepts trainees."
            : "Public scores appear after enough completed internships or student evaluations are collected."}
        </p>
      </div>
    );
  }

  const overallScore = summary ? formatOverallScore(summary) : null;
  const levelRaw = summary?.company_level;
  const level: "white" | "gray" | "black" =
    levelRaw === "white" || levelRaw === "gray" || levelRaw === "black" ? levelRaw : "gray";

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {overallScore != null && (
          <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
            ⭐ {overallScore}
          </span>
        )}
        {summary?.acceptance_ratio_pct != null && (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
            Acceptance {summary.acceptance_ratio_pct}%
          </span>
        )}
        {summary?.completion_rate_pct != null && (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">
            Completion {summary.completion_rate_pct}%
          </span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-500">
          {summary?.total_feedbacks ?? 0} evaluation{(summary?.total_feedbacks ?? 0) === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/60 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        {overallScore != null && (
          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">⭐ {overallScore}</p>
        )}
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${levelBadgeClasses(level)}`}
        >
          {levelLabel(level)}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Acceptance Rate</dt>
          <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
            {summary?.acceptance_ratio_pct != null ? `${summary.acceptance_ratio_pct}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Internship Completion</dt>
          <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
            {summary?.completion_rate_pct != null ? `${summary.completion_rate_pct}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Student Feedback</dt>
          <dd className="font-medium text-slate-900 dark:text-white">
            {summary?.avg_rating != null
              ? `${Math.round(Math.min(5, Math.max(1, summary.avg_rating)) * 10) / 10} / 5`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Evaluations</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{summary?.total_feedbacks ?? 0}</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
        Based on {summary?.total_feedbacks ?? 0} student evaluation
        {(summary?.total_feedbacks ?? 0) === 1 ? "" : "s"}, acceptance ratio, and completion rate.
      </p>
    </div>
  );
}

export function CompanyEvaluationPanel({
  companyId,
  variant = "default",
  className,
}: {
  companyId: string;
  variant?: "default" | "compact";
  className?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompanyEvaluationSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setSummary(null);
      const trimmed = companyId.trim();
      if (!trimmed) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { summary: s, error: err } = await fetchCompanyEvaluation(supabase, trimmed);
      if (cancelled) return;
      setSummary(s);
      setError(err);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <CompanyEvaluationDisplay loading={loading} error={error} summary={summary} variant={variant} className={className} />
  );
}
