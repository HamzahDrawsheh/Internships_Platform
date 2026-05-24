"use client";

import { Badge, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { formatMissingSkillsCount, type SkillGapAnalysis } from "@/lib/skill-match";

type Props = {
  analysis: SkillGapAnalysis;
  loading?: boolean;
};

export function SkillGapLearningPlanCard({ analysis, loading }: Props) {
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
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
            {formatMissingSkillsCount(missingSkillsCount, t)}
          </span>
        )}
      </div>

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
