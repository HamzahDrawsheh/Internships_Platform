"use client";

import { Button } from "@/components/ui";
import type { ReportSkillCategory, StudentReportSkillRow } from "@/lib/ai/task-to-skill";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  skill: StudentReportSkillRow;
  readOnly?: boolean;
  busy?: boolean;
  onAddToCv?: (skillId: string) => void;
  onRemove?: (skillId: string) => void;
};

function formatConfidence(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return "—";
  return `${Math.round(score * 100)}%`;
}

export function ReportSkillCard({ skill, readOnly, busy, onAddToCv, onRemove }: Props) {
  const { t } = useI18n();

  const categoryLabel = (() => {
    const map: Record<ReportSkillCategory, string> = {
      technical: t("taskToSkill.categoryTechnical"),
      soft: t("taskToSkill.categorySoft"),
      tool: t("taskToSkill.categoryTool"),
      domain: t("taskToSkill.categoryDomain"),
    };
    return map[skill.skill_category];
  })();

  const statusLabel = skill.added_to_cv
    ? t("taskToSkill.statusAddedToCv")
    : t("taskToSkill.statusEvidenceOnly");

  return (
    <article className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 to-indigo-50/60 p-4 shadow-sm dark:border-violet-500/30 dark:from-violet-500/10 dark:to-indigo-500/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{skill.skill_name}</h4>
          <p className="mt-0.5 text-xs text-violet-700 dark:text-violet-300">{categoryLabel}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
            {t("taskToSkill.confidence")}: {formatConfidence(skill.confidence_score)}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              skill.added_to_cv
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {statusLabel}
          </span>
          {skill.approved_by_supervisor ? (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-500/20 dark:text-sky-200">
              {t("taskToSkill.supervisorVerified")}
            </span>
          ) : null}
        </div>
      </div>

      {skill.evidence_text ? (
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t("taskToSkill.evidence")}: </span>
          {skill.evidence_text}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            disabled={busy || skill.added_to_cv}
            onClick={() => onAddToCv?.(skill.id)}
            className="text-xs"
          >
            {skill.added_to_cv ? t("taskToSkill.statusAddedToCv") : t("taskToSkill.addToCv")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => onRemove?.(skill.id)}
            className="text-xs"
          >
            {t("taskToSkill.removeSkill")}
          </Button>
        </div>
      ) : null}
    </article>
  );
}
