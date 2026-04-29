"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type CompanyEvaluationSummary = {
  avg_score: number | null;
  total_feedbacks: number;
  company_level: "white" | "gray" | "black" | null;
};

/** Normalize RPC payload: PostgREST may return `json` as a parsed object or a JSON string. */
function unwrapRpcJsonPayload(data: unknown): unknown {
  if (typeof data === "string") {
    const t = data.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }
  return data;
}

export function parseCompanyEvaluationRpc(data: unknown): CompanyEvaluationSummary | null {
  const unwrapped = unwrapRpcJsonPayload(data);
  if (unwrapped == null || typeof unwrapped !== "object") return null;
  const o = unwrapped as Record<string, unknown>;

  const tf = o.total_feedbacks;
  let totalFeedbacks = 0;
  if (typeof tf === "bigint") totalFeedbacks = Number(tf);
  else if (typeof tf === "number" && Number.isFinite(tf)) totalFeedbacks = tf;
  else if (typeof tf === "string") totalFeedbacks = Number(tf);
  else totalFeedbacks = Number(tf);
  if (!Number.isFinite(totalFeedbacks) || totalFeedbacks < 0) totalFeedbacks = 0;

  let avgScore: number | null = null;
  if (o.avg_score !== null && o.avg_score !== undefined) {
    const n = typeof o.avg_score === "number" ? o.avg_score : Number(o.avg_score);
    avgScore = Number.isFinite(n) ? n : null;
  }

  const rawLevel = o.company_level;
  let company_level: CompanyEvaluationSummary["company_level"] = null;
  if (typeof rawLevel === "string") {
    const k = rawLevel.trim().toLowerCase();
    if (k === "white" || k === "gray" || k === "black") company_level = k;
  }

  return {
    avg_score: avgScore,
    total_feedbacks: Math.floor(totalFeedbacks),
    company_level,
  };
}

export async function fetchCompanyEvaluation(
  supabase: SupabaseClient,
  companyId: string
): Promise<{ summary: CompanyEvaluationSummary | null; error: string | null }> {
  const trimmed = companyId.trim();
  if (!trimmed) {
    return { summary: null, error: "Missing company id" };
  }

  const { data, error } = await supabase.rpc("get_company_evaluation", { p_company_id: trimmed });

  if (error) {
    return { summary: null, error: error.message };
  }
  return { summary: parseCompanyEvaluationRpc(data), error: null };
}

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
        Loading evaluation…
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

  const hasTrainingFeedback = summary != null && summary.total_feedbacks > 0;

  if (!hasTrainingFeedback) {
    return (
      <p className={`text-sm text-slate-500 dark:text-slate-400 ${className}`}>Not evaluated yet</p>
    );
  }

  const scorePct =
    summary.avg_score != null ? Math.round(Math.min(1, Math.max(0, summary.avg_score)) * 1000) / 10 : null;

  const levelRaw = summary.company_level;
  const level: "white" | "gray" | "black" =
    levelRaw === "white" || levelRaw === "gray" || levelRaw === "black" ? levelRaw : "gray";

  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${levelBadgeClasses(level)}`}
        >
          {levelLabel(level)}
        </span>
        {scorePct != null && (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400">{scorePct}%</span>
        )}
        <span className="text-xs text-slate-500 dark:text-slate-500">
          {summary.total_feedbacks} feedback{summary.total_feedbacks === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/60 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${levelBadgeClasses(level)}`}
        >
          {levelLabel(level)}
        </span>
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Score</dt>
          <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
            {scorePct != null ? `${scorePct}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500 dark:text-slate-400">Training feedbacks</dt>
          <dd className="font-medium text-slate-900 dark:text-white">{summary.total_feedbacks}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
        Based on aggregated AI analysis of completed training feedback (no raw comments shown).
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
