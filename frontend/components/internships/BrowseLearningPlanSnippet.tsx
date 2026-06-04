"use client";

import Link from "next/link";
import type { LearningPlanEntry } from "@/lib/skill-match";
import type { ImprovementFallbackKey } from "@/lib/recommendations/match-score-breakdown";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  internshipId: string;
  missingSkillsCount: number;
  learningPlan: LearningPlanEntry[];
  improvementFallback?: ImprovementFallbackKey | null;
  compact?: boolean;
  /** When the parent card is already a link, omit the nested detail link. */
  hideDetailLink?: boolean;
};

export function BrowseLearningPlanSnippet({
  internshipId,
  missingSkillsCount,
  learningPlan,
  improvementFallback,
  compact = false,
  hideDetailLink = false,
}: Props) {
  const { t } = useI18n();

  if (missingSkillsCount <= 0 && !improvementFallback && learningPlan.length === 0) {
    return null;
  }

  const firstPlan = learningPlan[0];
  const firstStep = firstPlan?.steps[0];

  return (
    <div
      className={`rounded-xl border border-violet-200/80 bg-violet-50/70 dark:border-violet-500/25 dark:bg-violet-500/10 ${
        compact ? "mt-2 p-2.5" : "mt-3 p-3"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
        {t("skillMatch.learningPlan")}
      </p>
      {missingSkillsCount > 0 && firstStep ? (
        <p className={`mt-1 leading-snug text-slate-700 dark:text-slate-300 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          <span className="font-medium text-slate-900 dark:text-white">{firstPlan.skill}: </span>
          {firstStep}
          {learningPlan.length > 1 || (firstPlan.steps.length ?? 0) > 1
            ? ` · ${t("browse.learningPlanMoreOnDetail")}`
            : null}
        </p>
      ) : improvementFallback ? (
        <p className={`mt-1 leading-snug text-slate-700 dark:text-slate-300 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {t(`skillMatch.improveFallback.${improvementFallback}`)}
        </p>
      ) : (
        <p className={`mt-1 text-slate-600 dark:text-slate-400 ${compact ? "text-[10px]" : "text-[11px]"}`}>
          {t("skillMatch.callout")}
        </p>
      )}
      {!hideDetailLink ? (
        <Link
          href={`/internships/${internshipId}`}
          className={`mt-1.5 inline-block font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100 ${
            compact ? "text-[10px]" : "text-xs"
          }`}
        >
          {t("browse.viewFullLearningPlan")}
        </Link>
      ) : null}
    </div>
  );
}
