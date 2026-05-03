"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";

export type CompanyAiFeedbackSummaryData = {
  total_feedbacks: number;
  avg_score: number | null;
  positive: number;
  neutral: number;
  negative: number;
  keywords: string[];
};

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

export function parseCompanyAiFeedbackSummaryRpc(data: unknown): CompanyAiFeedbackSummaryData | null {
  const unwrapped = unwrapRpcJsonPayload(data);
  if (unwrapped == null || typeof unwrapped !== "object") return null;
  const o = unwrapped as Record<string, unknown>;

  const total =
    typeof o.total_feedbacks === "bigint"
      ? Number(o.total_feedbacks)
      : typeof o.total_feedbacks === "number"
        ? o.total_feedbacks
        : Number(o.total_feedbacks ?? 0);
  const total_feedbacks = Number.isFinite(total) && total >= 0 ? Math.floor(total) : 0;

  let avg_score: number | null = null;
  if (o.avg_score !== null && o.avg_score !== undefined) {
    const n = typeof o.avg_score === "number" ? o.avg_score : Number(o.avg_score);
    avg_score = Number.isFinite(n) ? n : null;
  }

  const sentimentCount = (key: string): number => {
    const v = o[key];
    const n =
      typeof v === "bigint" ? Number(v) : typeof v === "number" ? v : Number(v ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const keywordsRaw = o.keywords;
  let keywords: string[] = [];
  if (Array.isArray(keywordsRaw)) {
    keywords = keywordsRaw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }

  return {
    total_feedbacks,
    avg_score,
    positive: sentimentCount("positive"),
    neutral: sentimentCount("neutral"),
    negative: sentimentCount("negative"),
    keywords,
  };
}

type Props = {
  companyId: string | null;
  className?: string;
};

export function CompanyAiFeedbackSummary({ companyId, className = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompanyAiFeedbackSummaryData | null>(null);

  useEffect(() => {
    if (!companyId?.trim()) {
      setLoading(false);
      setSummary(null);
      setError(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      setLoading(true);
      setError(null);
      const trimmed = companyId.trim();
      const { data, error: rpcError } = await supabase.rpc("get_company_feedback_ai_summary", {
        p_company_id: trimmed,
      });

      if (cancelled) return;

      if (rpcError) {
        setSummary(null);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      setSummary(parseCompanyAiFeedbackSummaryRpc(data));
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  if (!companyId?.trim()) {
    return null;
  }

  const outerClass = `rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 ${className}`;

  if (loading) {
    return (
      <section className={outerClass} aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-16 w-full rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={outerClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI training feedback insights</h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200" role="alert">
          Unable to load insights: {error}
        </p>
      </section>
    );
  }

  const s = summary;
  const total = s?.total_feedbacks ?? 0;
  const avgLabel =
    s?.avg_score != null && Number.isFinite(s.avg_score) ? s.avg_score.toFixed(2) : "—";

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className={outerClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI training feedback insights</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Aggregated from written training evaluations (no raw student text shown).
          </p>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100">
          Avg score {avgLabel}
          {avgLabel !== "—" ? " / 1" : ""}
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl dark:bg-indigo-500/15">
            <span aria-hidden>📊</span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">No AI summaries yet</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Insights appear after students complete internships and submit training evaluations that have been analyzed.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Based on <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span> analyzed
            feedback{total === 1 ? "" : "s"}.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                Positive
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{s?.positive ?? 0}</p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">{pct(s?.positive ?? 0)}%</p>
            </Card>
            <Card className="border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Neutral
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s?.neutral ?? 0}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{pct(s?.neutral ?? 0)}%</p>
            </Card>
            <Card className="border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-800 dark:text-rose-200">
                Negative
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{s?.negative ?? 0}</p>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/80">{pct(s?.negative ?? 0)}%</p>
            </Card>
          </div>

          {(s?.keywords?.length ?? 0) > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Themes & keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(s?.keywords ?? []).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
