"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui";
import {
  parseCompanyAiFeedbackSummaryRpc,
  type CompanyAiFeedbackSummaryData,
} from "@/components/companies/CompanyAiFeedbackSummary";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type Props = {
  /** When false, no RPC is called (e.g. supervisor has no department row). */
  eligible: boolean;
  className?: string;
};

export function SupervisorAiInsights({ eligible, className = "" }: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CompanyAiFeedbackSummaryData | null>(null);

  useEffect(() => {
    if (!eligible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      const { data, error: rpcError } = await supabase.rpc("get_supervisor_department_ai_summary");

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
  }, [eligible]);

  if (!eligible) {
    return null;
  }

  const outerClass = `rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900 ${className}`;

  if (loading) {
    return (
      <section className={outerClass} aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-56 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-full rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-16 w-full rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={outerClass}>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("supervisor.insights.title")}</h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-200" role="alert">
          {t("supervisor.insights.loadError")} {error}
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t("supervisor.insights.title")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t("supervisor.insights.subtitle")}</p>
        </div>
        {avgLabel !== "—" ? (
          <div className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-900 dark:bg-teal-500/15 dark:text-teal-100">
            {fmt(t("supervisor.insights.avgScore"), { score: avgLabel })}
          </div>
        ) : null}
      </div>

      {total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-xl dark:bg-teal-500/15">
            <span aria-hidden>📊</span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            {t("supervisor.insights.noSummariesTitle")}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{t("supervisor.insights.noSummariesDesc")}</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {fmt(total === 1 ? t("supervisor.insights.basedOnOne") : t("supervisor.insights.basedOnMany"), {
              count: total,
            })}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Card className="border-emerald-200/80 bg-emerald-50/80 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                {t("supervisor.insights.positive")}
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100">{s?.positive ?? 0}</p>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">{pct(s?.positive ?? 0)}%</p>
            </Card>
            <Card className="border-slate-200 bg-slate-50 p-4 dark:border-slate-600 dark:bg-slate-800/80">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                {t("supervisor.insights.neutral")}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{s?.neutral ?? 0}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">{pct(s?.neutral ?? 0)}%</p>
            </Card>
            <Card className="border-rose-200/80 bg-rose-50/80 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-800 dark:text-rose-200">
                {t("supervisor.insights.negative")}
              </p>
              <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{s?.negative ?? 0}</p>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/80">{pct(s?.negative ?? 0)}%</p>
            </Card>
          </div>

          {(s?.keywords?.length ?? 0) > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t("supervisor.insights.themesKeywords")}
              </h3>
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
