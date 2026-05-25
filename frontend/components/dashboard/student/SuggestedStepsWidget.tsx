"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CyclicWidget } from "@/components/dashboard/CyclicWidget";
import { Button } from "@/components/ui";
import { openStudentAssistant } from "@/lib/ai/open-student-assistant";
import { buildStudentSuggestionSlides } from "@/lib/dashboard/student-career-hints";
import { useI18n } from "@/lib/i18n/context";

type Props = {
  hasDepartment: boolean;
  hasCv: boolean;
  hasApplied: boolean;
  technicalSkills: string[];
  softSkills: string[];
  takenCourses: string[];
  customCourses: string[];
  preferredField: string | null;
  major: string | null;
};

const STEP_KIND: Record<string, "step" | "career" | "tip" | "help"> = {
  profile: "step",
  cv: "step",
  browse: "step",
  career: "career",
  assistant: "help",
  refresh: "tip",
};

export function SuggestedStepsWidget(props: Props) {
  const { t } = useI18n();

  const suggestionSlides = useMemo(
    () =>
      buildStudentSuggestionSlides({
        ...props,
        labels: {
          stepProfileTitle: t("dashboard.student.stepProfileTitle"),
          stepProfileDesc: t("dashboard.student.stepProfileDesc"),
          stepProfileCta: t("dashboard.student.stepProfileCtaTodo"),
          stepCvTitle: t("dashboard.student.stepCvTitle"),
          stepCvDesc: t("dashboard.student.stepCvDesc"),
          stepCvCta: t("dashboard.student.stepCvCtaTodo"),
          stepBrowseTitle: t("dashboard.student.stepBrowseTitle"),
          stepBrowseDesc: t("dashboard.student.stepBrowseDesc"),
          stepBrowseCta: t("dashboard.student.stepBrowseCtaTodo"),
          careerTitle: t("dashboard.student.widgets.careerDirection"),
          careerBecause: t("dashboard.student.widgets.careerBecause"),
          hintRefreshTitle: t("dashboard.student.widgets.hintRefreshTitle"),
          hintRefreshBody: t("dashboard.student.widgets.hintRefreshBody"),
          hintRefreshCta: t("dashboard.student.widgets.hintRefreshCta"),
          assistantTitle: t("dashboard.student.widgets.assistantTitle"),
          assistantBody: t("dashboard.student.widgets.assistantBody"),
          assistantCta: t("dashboard.student.widgets.assistantCta"),
        },
      }),
    [props, t]
  );

  const slides = useMemo(
    () =>
      suggestionSlides.map((slide) => {
        const kind = STEP_KIND[slide.id] ?? "tip";
        const badge =
          kind === "career"
            ? t("dashboard.student.widgets.suggestedForYou")
            : kind === "step"
              ? t("dashboard.student.widgets.nextStep")
              : kind === "help"
                ? t("dashboard.student.widgets.needHelp")
                : t("dashboard.student.widgets.smartTip");

        return {
          id: slide.id,
          content: (
            <div className="flex h-full flex-col">
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                {badge}
              </span>
              <h4 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{slide.title}</h4>
              <p
                className={`mt-2 text-sm leading-relaxed ${
                  slide.id === "career"
                    ? "text-lg font-semibold text-amber-900 dark:text-amber-100"
                    : "text-gray-700 dark:text-slate-300"
                }`}
              >
                {slide.body}
              </p>
              {slide.bullets?.length ? (
                <div className="mt-3 rounded-xl border border-amber-200/60 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-slate-900/50">
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                    {t("dashboard.student.widgets.careerBecause")}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-gray-600 dark:text-slate-400">
                    {slide.bullets.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" aria-hidden />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {slide.action === "assistant" && slide.cta ? (
                <div className="mt-auto pt-4">
                  <Button
                    type="button"
                    variant="primary"
                    className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 shadow-md shadow-teal-500/20 hover:from-teal-700 hover:to-cyan-700"
                    onClick={() => openStudentAssistant()}
                  >
                    {slide.cta}
                  </Button>
                </div>
              ) : slide.href && slide.cta ? (
                <Link href={slide.href} className="mt-auto pt-4">
                  <Button
                    variant="secondary"
                    className="w-full rounded-xl border-amber-200 bg-white hover:bg-amber-50 dark:border-amber-500/30 dark:bg-slate-900 dark:hover:bg-amber-500/10"
                  >
                    {slide.cta}
                  </Button>
                </Link>
              ) : null}
            </div>
          ),
        };
      }),
    [suggestionSlides, t]
  );

  return (
    <CyclicWidget
      title={t("dashboard.student.widgets.stepsTitle")}
      subtitle={t("dashboard.student.widgets.stepsSubtitle")}
      iconName="clipboard"
      slides={slides}
      accentClass="from-amber-50 via-white to-orange-50 border-amber-200/70 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30 dark:border-amber-500/30"
      dotClass="bg-amber-600 dark:bg-amber-400"
    />
  );
}
