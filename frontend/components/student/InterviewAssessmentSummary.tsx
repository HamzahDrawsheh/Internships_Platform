"use client";

import { useMemo } from "react";
import {
  buildInterviewAssessmentSummary,
  type InterviewPerformanceLevel,
  type SkillBreakdownScores,
} from "@/lib/ai/interview-assessment-summary";
import { Badge, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/context";
import { fmt } from "@/lib/i18n/format";

type EvaluationResult = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestedAnswer: string;
};

type HistoryItem = {
  question: string;
  answer: string;
  evaluation: EvaluationResult;
};

type Props = {
  history: HistoryItem[];
};

const LEVEL_BADGE_VARIANT: Record<
  InterviewPerformanceLevel,
  "danger" | "warning" | "info" | "success"
> = {
  beginner: "danger",
  intermediate: "warning",
  advanced: "info",
  excellent: "success",
};

const LEVEL_CARD_CLASS: Record<InterviewPerformanceLevel, string> = {
  beginner:
    "border-red-200/80 bg-red-50/70 dark:border-red-500/30 dark:bg-red-500/10",
  intermediate:
    "border-amber-200/80 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/10",
  advanced:
    "border-violet-200/80 bg-violet-50/70 dark:border-violet-500/30 dark:bg-violet-500/10",
  excellent:
    "border-emerald-200/80 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10",
};

function getProgressTone(percentage: number): {
  barClass: string;
  trackClass: string;
} {
  if (percentage >= 70) {
    return {
      barClass: "bg-emerald-500 dark:bg-emerald-400",
      trackClass: "bg-emerald-100 dark:bg-emerald-500/20",
    };
  }
  if (percentage >= 40) {
    return {
      barClass: "bg-amber-500 dark:bg-amber-400",
      trackClass: "bg-amber-100 dark:bg-amber-500/20",
    };
  }
  return {
    barClass: "bg-red-500 dark:bg-red-400",
    trackClass: "bg-red-100 dark:bg-red-500/20",
  };
}

function ScoreProgressBar({
  percentage,
  label,
}: {
  percentage: number;
  label: string;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const tone = getProgressTone(clamped);

  return (
    <div className="space-y-2">
      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ${tone.trackClass}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.barClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function SkillBreakdownRow({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const percentage = Math.round(score * 10);
  const tone = getProgressTone(percentage);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-gray-900 dark:text-white">{label}</span>
        <span className="shrink-0 text-gray-600 dark:text-slate-400">{score.toFixed(1)}/10</span>
      </div>
      <div
        className={`h-2 w-full overflow-hidden rounded-full ${tone.trackClass}`}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.barClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function TopicList({
  items,
  icon,
  emptyLabel,
}: {
  items: string[];
  icon: string;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-gray-500 dark:text-slate-400">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
          <span aria-hidden="true" className="mt-0.5 shrink-0 font-medium">
            {icon}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const SKILL_BREAKDOWN_ORDER: Array<{
  key: keyof SkillBreakdownScores;
  labelKey: string;
}> = [
  { key: "technicalKnowledge", labelKey: "interviewSimulator.skillTechnicalKnowledge" },
  { key: "problemSolving", labelKey: "interviewSimulator.skillProblemSolving" },
  { key: "communication", labelKey: "interviewSimulator.skillCommunication" },
  { key: "practicalExperience", labelKey: "interviewSimulator.skillPracticalExperience" },
];

export function InterviewAssessmentSummary({ history }: Props) {
  const { t, isArabic } = useI18n();
  const locale = isArabic ? "ar" : "en";

  const assessment = useMemo(() => {
    return buildInterviewAssessmentSummary({
      scores: history.map((item) => item.evaluation.score),
      strengths: history.flatMap((item) => item.evaluation.strengths),
      weaknesses: history.flatMap((item) => item.evaluation.weaknesses),
      questions: history.map((item) => item.question),
      answers: history.map((item) => item.answer),
      locale,
    });
  }, [history, locale]);

  if (!assessment) return null;

  const levelLabel = t(`interviewSimulator.level.${assessment.performanceLevel}`);

  return (
    <div className="space-y-4">
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("interviewSimulator.overallAssessmentTitle")}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
            {t("interviewSimulator.overallAssessmentDescription")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 px-4 py-4 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-600 dark:text-slate-400">
              {t("interviewSimulator.overallScoreLabel")}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {assessment.overallScore.toFixed(1)} / 10
            </p>
            <p className="mt-1 text-sm text-violet-700 dark:text-violet-200">
              {fmt(t("interviewSimulator.percentageLabel"), { pct: assessment.percentage })}
            </p>
            <div className="mt-4">
              <ScoreProgressBar
                percentage={assessment.percentage}
                label={t("interviewSimulator.overallScoreLabel")}
              />
            </div>
          </div>

          <div
            className={`rounded-xl border px-4 py-4 ${LEVEL_CARD_CLASS[assessment.performanceLevel]}`}
          >
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
              {t("interviewSimulator.performanceLevelLabel")}
            </p>
            <div className="mt-3">
              <Badge variant={LEVEL_BADGE_VARIANT[assessment.performanceLevel]} className="text-sm px-3 py-1">
                {levelLabel}
              </Badge>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 px-4 py-4 dark:border-slate-700">
          <p className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
            {t("interviewSimulator.skillBreakdownTitle")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SKILL_BREAKDOWN_ORDER.map(({ key, labelKey }) => (
              <SkillBreakdownRow
                key={key}
                label={t(labelKey)}
                score={assessment.skillBreakdown[key]}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("interviewSimulator.strongAreasTitle")}
            </p>
            <TopicList
              items={assessment.strongAreas}
              icon="✓"
              emptyLabel={t("interviewSimulator.noStrongAreas")}
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("interviewSimulator.improvementAreasTitle")}
            </p>
            <TopicList
              items={assessment.areasForImprovement}
              icon="✗"
              emptyLabel={t("interviewSimulator.noImprovementAreas")}
            />
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t("interviewSimulator.recommendedTopicsTitle")}
          </p>
          <TopicList
            items={assessment.recommendedTopics}
            icon="•"
            emptyLabel={t("interviewSimulator.noRecommendedTopics")}
          />
        </div>
      </Card>

      <Card className="space-y-3 p-5 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("interviewSimulator.interviewFeedbackTitle")}
        </h3>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">
          {assessment.feedbackParagraph}
        </p>
      </Card>
    </div>
  );
}
