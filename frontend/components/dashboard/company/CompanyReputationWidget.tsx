"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FractionalStarRating } from "@/components/common/FractionalStarRating";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { CompanyHintSlideContent } from "@/components/dashboard/company/CompanyHintSlideContent";
import { Button } from "@/components/ui";
import {
  buildCompanyReputationHintSlides,
  dimensionLabel,
} from "@/lib/dashboard/company-dashboard-hints";
import type { CompanyDashboardSnapshot } from "@/lib/dashboard/load-company-dashboard-snapshot";
import {
  formatOverallScore,
  isCompanyPubliclyEvaluated,
  type CompanyEvaluationSummary,
} from "@/lib/companies/evaluation";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type Props = {
  snapshot: CompanyDashboardSnapshot;
};

const W = "dashboard.company.widgets";
const DIMENSION_ORDER = ["overall", "mentorship", "environment", "skills"] as const;

function scoreBarFill(value: number): string {
  const t = Math.max(0, Math.min(1, value / 5));
  const from = { r: 250, g: 204, b: 21 };
  const to = { r: 34, g: 197, b: 94 };
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  const r2 = Math.round(r * 0.88);
  const g2 = Math.round(g * 0.88);
  const b2 = Math.round(b * 0.88);
  return `linear-gradient(to right, rgb(${r}, ${g}, ${b}), rgb(${r2}, ${g2}, ${b2}))`;
}

function levelBadge(level: "white" | "gray" | "black"): string {
  switch (level) {
    case "white":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200";
    case "gray":
      return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
    case "black":
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";
  }
}

function DimensionBar({
  label,
  value,
  highlight,
  needsAttentionLabel,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  needsAttentionLabel: string;
}) {
  const pct = Math.round((value / 5) * 100);
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`text-[10px] font-medium ${highlight ? "text-teal-800 dark:text-teal-200" : "text-gray-500 dark:text-slate-400"}`}
          >
            {label}
          </span>
          {highlight ? (
            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-semibold text-teal-900 dark:bg-teal-500/25 dark:text-teal-100">
              {needsAttentionLabel}
            </span>
          ) : null}
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-gray-800 dark:text-slate-200">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/50">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: scoreBarFill(value) }}
        />
      </div>
    </div>
  );
}

function StandingSlide({
  summary,
  companyId,
  t,
}: {
  summary: CompanyEvaluationSummary | null;
  companyId: string;
  t: (key: string) => string;
}) {
  const showPublic = isCompanyPubliclyEvaluated(summary);
  const r = `${W}.reputation`;

  if (!showPublic || !summary) {
    const count = summary?.total_feedbacks ?? 0;
    return (
      <div className="flex h-full flex-col">
        <span className="inline-flex w-fit rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-semibold text-sky-900 dark:bg-sky-500/20 dark:text-sky-100">
          {summary?.is_new_company !== false ? t(`${r}.newCompany`) : t(`${r}.buildingScore`)}
        </span>
        <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          {summary?.is_new_company !== false ? t(`${r}.newCompanyBody`) : t(`${r}.buildingScoreBody`)}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
          {fmt(t(count === 1 ? `${r}.evaluationsCollected` : `${r}.evaluationsCollectedPlural`), {
            count,
          })}
        </p>
        <Link href="/company/internships/new" className="mt-auto pt-4">
          <Button variant="primary" className="w-full rounded-xl text-xs">
            {t(`${r}.postInternship`)}
          </Button>
        </Link>
      </div>
    );
  }

  const overallScore = formatOverallScore(summary);
  const ratingValue =
    summary.avg_rating != null
      ? Math.min(5, Math.max(0, summary.avg_rating))
      : summary.company_score != null
        ? Math.min(5, Math.max(0, summary.company_score * 5))
        : 0;
  const levelRaw = summary.company_level;
  const level: "white" | "gray" | "black" =
    levelRaw === "white" || levelRaw === "gray" || levelRaw === "black" ? levelRaw : "gray";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2">
        {overallScore ? (
          <p className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{overallScore}</p>
        ) : null}
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${levelBadge(level)}`}>
          {t(`${W}.levels.${level}`)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-gray-500 dark:text-slate-400">{t(`${r}.acceptance`)}</dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
            {summary.acceptance_ratio_pct != null ? `${summary.acceptance_ratio_pct}%` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500 dark:text-slate-400">{t(`${r}.completion`)}</dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-white">
            {summary.completion_rate_pct != null ? `${summary.completion_rate_pct}%` : "—"}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
        {fmt(
          t(
            summary.total_feedbacks === 1
              ? `${r}.basedOnEvaluations`
              : `${r}.basedOnEvaluationsPlural`,
          ),
          { count: summary.total_feedbacks },
        )}
      </p>
      <div className="flex flex-1 flex-col items-center justify-center py-4">
        <FractionalStarRating value={ratingValue} size="lg" />
        {overallScore ? (
          <p className="mt-2 text-xs font-medium tabular-nums text-gray-500 dark:text-slate-400">
            {overallScore} / 5
          </p>
        ) : null}
      </div>
      <Link
        href={`/companies/${companyId}`}
        className="mt-auto pt-3 text-xs font-medium text-teal-700 hover:underline dark:text-teal-300"
      >
        {t(`${r}.viewPublicProfile`)}
      </Link>
    </div>
  );
}

export function CompanyReputationWidget({ snapshot }: Props) {
  const { t } = useI18n();
  const r = `${W}.reputation`;

  const hintSlide = useMemo(
    () => buildCompanyReputationHintSlides(snapshot, t)[0],
    [snapshot, t],
  );
  const dims = snapshot.dimensionAvgs;
  const weak = snapshot.weakestDimension;
  const totalFeedbacks = snapshot.evaluation?.total_feedbacks ?? 0;
  const showDimensions = totalFeedbacks >= 1 && dims != null;

  const slides = useMemo(
    () => [
      {
        id: "standing",
        content: <StandingSlide summary={snapshot.evaluation} companyId={snapshot.companyId} t={t} />,
      },
      {
        id: "dimensions",
        content: showDimensions ? (
          <div className="flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
              {t(`${r}.dimensionBreakdown`)}
            </p>
            <p className="mt-0.5 text-[10px] text-gray-500 dark:text-slate-400">
              {fmt(
                t(
                  snapshot.trainingFeedbackCount === 1
                    ? `${r}.fromEvaluations`
                    : `${r}.fromEvaluationsPlural`,
                ),
                { count: snapshot.trainingFeedbackCount },
              )}
            </p>
            <div className="mt-3 flex-1 space-y-3">
              {DIMENSION_ORDER.map((key) => (
                <DimensionBar
                  key={key}
                  label={dimensionLabel(key, t)}
                  value={dims![key]}
                  highlight={key === weak}
                  needsAttentionLabel={t(`${r}.needsAttention`)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center text-sm text-gray-500 dark:text-slate-400">
            {totalFeedbacks >= 1 ? t(`${r}.dimensionLegacyOnly`) : t(`${r}.dimensionEmpty`)}
          </div>
        ),
      },
      {
        id: "hint",
        content: hintSlide ? <CompanyHintSlideContent slide={hintSlide} /> : null,
      },
    ],
    [snapshot, dims, weak, hintSlide, showDimensions, totalFeedbacks, t, r],
  );

  return (
    <CyclicWidget
      title={t(`${r}.title`)}
      subtitle={t(`${r}.subtitle`)}
      iconName="chart"
      slides={slides}
      accentClass="from-teal-50 via-white to-cyan-50 border-teal-200/70 dark:from-teal-950/40 dark:via-slate-900 dark:to-cyan-950/30 dark:border-teal-500/30"
      dotClass="bg-teal-600 dark:bg-teal-400"
    />
  );
}
