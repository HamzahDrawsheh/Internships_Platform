"use client";

import { Badge, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";
import type { MatchScoreBreakdown } from "@/lib/recommendations/match-score-breakdown";
import { formatMissingSkillsCount, type SkillGapAnalysis } from "@/lib/skill-match";

type Props = {
  analysis: SkillGapAnalysis;
  loading?: boolean;
  breakdown?: MatchScoreBreakdown | null;
};

function suitabilityStyles(suitability: MatchScoreBreakdown["suitability"]) {
  switch (suitability) {
    case "strong":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100";
    case "moderate":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100";
    case "stretch":
      return "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100";
    default:
      return "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200";
  }
}

function suitabilityLabel(
  suitability: MatchScoreBreakdown["suitability"],
  t: (key: string) => string
): string {
  switch (suitability) {
    case "strong":
      return t("skillMatch.suitabilityStrong");
    case "moderate":
      return t("skillMatch.suitabilityModerate");
    case "stretch":
      return t("skillMatch.suitabilityStretch");
    default:
      return t("skillMatch.suitabilityUnknown");
  }
}

function suitabilityNote(
  suitability: MatchScoreBreakdown["suitability"],
  t: (key: string) => string
): string {
  switch (suitability) {
    case "strong":
      return t("skillMatch.suitabilityNoteStrong");
    case "moderate":
      return t("skillMatch.suitabilityNoteModerate");
    case "stretch":
      return t("skillMatch.suitabilityNoteStretch");
    default:
      return t("skillMatch.suitabilityNoteUnknown");
  }
}

function ScoreBreakdownSection({
  breakdown,
  t,
}: {
  breakdown: MatchScoreBreakdown;
  t: (key: string) => string;
}) {
  return (
    <section className="mt-4 rounded-xl border border-violet-200/80 bg-white/80 p-4 dark:border-violet-500/25 dark:bg-slate-900/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("skillMatch.scoreBreakdown")}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${suitabilityStyles(breakdown.suitability)}`}
        >
          {suitabilityLabel(breakdown.suitability, t)}
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-300">
        {breakdown.match_percentage}%
        <span className="ms-2 text-sm font-medium text-gray-500 dark:text-slate-400">
          {t("skillMatch.overallMatch")}
        </span>
      </p>

      <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-300">
        {breakdown.score_factors.includes("semantic") && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
            <span>
              {fmt(t("skillMatch.semanticFactor"), { pct: breakdown.semantic_match_pct })}
            </span>
          </li>
        )}
        {breakdown.score_factors.includes("skill_overlap") && breakdown.skill_overlap_pct != null && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <span>
              {fmt(t("skillMatch.skillOverlapFactor"), {
                matched: breakdown.matched_skill_count,
                total: breakdown.total_required_skills,
                pct: breakdown.skill_overlap_pct,
              })}
            </span>
          </li>
        )}
        {breakdown.score_factors.includes("company_level") && breakdown.company_level && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
            <span>
              {fmt(t(`skillMatch.companyLevelFactor.${breakdown.company_level}`), {
                rec: breakdown.recommendation_score ?? breakdown.match_percentage,
              })}
            </span>
          </li>
        )}
        {breakdown.score_factors.includes("company_rank") &&
          breakdown.recommendation_score != null && (
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" aria-hidden />
              <span>
                {fmt(t("skillMatch.companyRankFactor"), {
                  rec: breakdown.recommendation_score,
                  confidence: breakdown.company_confidence ?? "medium",
                })}
              </span>
            </li>
          )}
        {breakdown.score_factors.includes("work_type") && breakdown.listing_work_type_label && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
            <span>
              {fmt(t("skillMatch.workTypeFactor"), { type: breakdown.listing_work_type_label })}
            </span>
          </li>
        )}
        {breakdown.score_factors.includes("location_city") && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" aria-hidden />
            <span>{t("skillMatch.locationCityFactor")}</span>
          </li>
        )}
        {breakdown.score_factors.includes("semantic_vs_skills") && (
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
            <span>{t("skillMatch.semanticVsSkillsNote")}</span>
          </li>
        )}
      </ul>

      <p className="mt-3 text-xs leading-relaxed text-gray-600 dark:text-slate-400">
        {suitabilityNote(breakdown.suitability, t)}
      </p>

      {breakdown.improvement_priorities.length > 0 || breakdown.improvement_fallback ? (
        <div className="mt-4 border-t border-violet-100 pt-4 dark:border-violet-500/20">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("skillMatch.howToImprove")}
          </h4>
          {breakdown.improvement_priorities.length > 0 ? (
            <>
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                {t("skillMatch.improveIntro")}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700 dark:text-slate-300">
                {breakdown.improvement_priorities.map((skill) => (
                  <li key={skill}>{fmt(t("skillMatch.improveSkillItem"), { skill })}</li>
                ))}
              </ul>
            </>
          ) : breakdown.improvement_fallback ? (
            <p className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              {t(`skillMatch.improveFallback.${breakdown.improvement_fallback}`)}
            </p>
          ) : null}
        </div>
      ) : null}

      {breakdown.keyword_matched_skills.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
            {t("skillMatch.profileKeywords")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {breakdown.keyword_matched_skills.map((s) => (
              <Badge key={s} variant="info" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function SkillGapLearningPlanCard({ analysis, loading, breakdown }: Props) {
  const { t } = useI18n();

  if (loading) {
    return (
      <Card className="border-violet-200 bg-violet-50/40 p-6 dark:border-violet-500/30 dark:bg-violet-500/10">
        <p className="text-sm text-gray-600 dark:text-slate-400" role="status">
          {t("common.loading")}
        </p>
      </Card>
    );
  }

  const { missingSkillsCount, hasDetectableInternshipSkills } = analysis;
  const hasStudentSkills = analysis.studentSkillCount > 0;
  const noMissing = missingSkillsCount === 0 && hasDetectableInternshipSkills;

  return (
    <Card className="border-violet-200 bg-violet-50/40 p-6 dark:border-violet-500/30 dark:bg-violet-500/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("skillMatch.title")}
        </h2>
        {hasDetectableInternshipSkills && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              noMissing
                ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100"
                : "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
            }`}
          >
            {formatMissingSkillsCount(missingSkillsCount, t)}
          </span>
        )}
      </div>

      {breakdown ? <ScoreBreakdownSection breakdown={breakdown} t={t} /> : null}

      {!hasStudentSkills && (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200/90">
          {t("skillMatch.addProfileSkills")}
        </p>
      )}

      {!hasDetectableInternshipSkills && (
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-400">
          {t("skillMatch.noInternshipSkills")}
        </p>
      )}

      {hasDetectableInternshipSkills && (
        <>
          {noMissing ? (
            <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-200/90">
              {t("skillMatch.noMissing")}
            </p>
          ) : (
            <p className="mt-3 rounded-lg border border-violet-200/80 bg-white/60 px-3 py-2 text-sm text-violet-900 dark:border-violet-500/25 dark:bg-slate-900/40 dark:text-violet-100">
              {t("skillMatch.callout")}
            </p>
          )}

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("skillMatch.skillsYouHave")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {analysis.matchedSkills.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">—</p>
              ) : (
                analysis.matchedSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="success"
                    className="dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                  >
                    {skill}
                  </Badge>
                ))
              )}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t("skillMatch.skillsToImprove")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {missingSkillsCount === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">—</p>
              ) : (
                analysis.missingSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="warning"
                    className="dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-100"
                  >
                    {skill}
                  </Badge>
                ))
              )}
            </div>
          </section>

          {analysis.learningPlan.length > 0 && (
            <section className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("skillMatch.learningPlan")}
              </h3>
              <ul className="mt-3 space-y-4">
                {analysis.learningPlan.map((entry) => (
                  <li
                    key={entry.skill}
                    className="rounded-lg border border-violet-100 bg-white/70 p-4 dark:border-violet-500/20 dark:bg-slate-900/50"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.skill}</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-gray-700 dark:text-slate-300">
                      {entry.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Card>
  );
}
